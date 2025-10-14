import express from 'express';
import { randomUUID } from 'crypto';
import { createSession, connectPlaywright, endSession } from '../services/browserbase-service.js';
import { testWebsite } from '../services/agent-service.js';
import { generateReport, getTestReport } from '../services/report-service.js';
import { createTest, updateTestStatus, getTest, getAllTests, saveActionLog } from '../database/db.js';

const router = express.Router();

// Store active test sessions in memory
const activeSessions = new Map();

// Queue for pending tests (to handle concurrent session limits)
const testQueue = [];
let isProcessingQueue = false;

/**
 * Process the test queue
 */
async function processQueue() {
  if (isProcessingQueue || testQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (testQueue.length > 0) {
    // Check if we can start a new test (limit concurrent sessions)
    if (activeSessions.size >= 1) {
      console.log('⏸️  Queue processing paused - waiting for active session to complete');
      break;
    }

    const queuedTest = testQueue.shift();
    console.log(`📤 Processing queued test: ${queuedTest.testId} (${testQueue.length} remaining in queue)`);

    try {
      // Create Browserbase session
      const { sessionId: browserbaseSessionId, liveViewUrl } = await createSession();

      // Update test with session ID
      createTest(queuedTest.testId, queuedTest.url, browserbaseSessionId);

      console.log(`✅ Test created from queue: ${queuedTest.testId}`);
      console.log(`📺 Live view: ${liveViewUrl}`);

      // Update queued test status
      if (queuedTest.updateCallback) {
        queuedTest.updateCallback({
          sessionId: browserbaseSessionId,
          liveViewUrl,
          status: 'starting',
        });
      }

      // Start test execution in background
      runTestInBackground(queuedTest.testId, queuedTest.url, browserbaseSessionId);

      // Wait a bit before processing next item
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to start queued test ${queuedTest.testId}:`, error);
      updateTestStatus(queuedTest.testId, 'failed', error.message);

      if (queuedTest.updateCallback) {
        queuedTest.updateCallback({
          status: 'failed',
          error: error.message,
        });
      }
    }
  }

  isProcessingQueue = false;
}

/**
 * POST /api/test/start
 * Start a new test for a given URL
 */
router.post('/start', async (req, res) => {
  let browserbaseSessionId = null;

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        message: 'Please provide a website URL to test',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid URL including protocol (e.g., https://example.com)',
      });
    }

    console.log(`🚀 Starting new test for: ${url}`);

    // Generate test ID
    const testId = randomUUID();

    // Check if we're at concurrent session limit
    if (activeSessions.size >= 1) {
      console.log(`⏳ Concurrent session limit reached. Adding test ${testId} to queue (position: ${testQueue.length + 1})`);

      // Create test record with queued status
      createTest(testId, url, null);
      updateTestStatus(testId, 'queued');

      // Add to queue
      testQueue.push({
        testId,
        url,
        queuedAt: new Date().toISOString(),
      });

      // Store in active sessions with queued status
      activeSessions.set(testId, {
        status: 'queued',
        progress: [],
        queuePosition: testQueue.length,
        queuedAt: new Date().toISOString(),
      });

      return res.json({
        testId,
        status: 'queued',
        queuePosition: testQueue.length,
        message: `Test queued. There are ${testQueue.length} test(s) in queue. It will start when a session becomes available.`,
      });
    }

    // Create Browserbase session
    const session = await createSession();
    browserbaseSessionId = session.sessionId;
    const liveViewUrl = session.liveViewUrl;

    // Save test to database
    createTest(testId, url, browserbaseSessionId);

    console.log(`✅ Test created: ${testId}`);
    console.log(`📺 Live view: ${liveViewUrl}`);

    // Start test execution in background
    runTestInBackground(testId, url, browserbaseSessionId);

    // Return immediately with session info
    res.json({
      testId,
      sessionId: browserbaseSessionId,
      liveViewUrl,
      status: 'starting',
      message: 'Test is starting. Use the session ID to check status.',
    });
  } catch (error) {
    console.error('❌ Failed to start test:', error);

    // Clean up session if it was created
    if (browserbaseSessionId) {
      try {
        await endSession(browserbaseSessionId);
        console.log('✅ Cleaned up Browserbase session after error');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup session:', cleanupError.message);
      }
    }

    res.status(500).json({
      error: 'Failed to start test',
      message: error.message,
    });
  }
});

/**
 * Background test execution
 */
async function runTestInBackground(testId, url, browserbaseSessionId) {
  let browser = null;
  let page = null;

  try {
    // Update status to running
    updateTestStatus(testId, 'running');

    // Store in active sessions
    activeSessions.set(testId, {
      status: 'running',
      progress: [],
      startedAt: new Date().toISOString(),
    });

    console.log(`🔄 Connecting to Browserbase session: ${browserbaseSessionId}`);

    // Connect Playwright to Browserbase
    const connection = await connectPlaywright(browserbaseSessionId);
    browser = connection.browser;
    page = connection.page;

    console.log(`🌐 Navigating to website: ${url}`);

    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to the website
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log(`✅ Successfully loaded: ${url}`);
    console.log(`📺 Live view available at: https://browserbase.com/sessions/${browserbaseSessionId}`);

    // Update status to show it's running
    const session = activeSessions.get(testId);
    if (session) {
      session.progress.push({
        timestamp: new Date().toISOString(),
        status: 'loaded',
        message: `Website loaded: ${url}`,
      });
    }

    // Create action logs array
    const actionLogs = [{
      timestamp: new Date().toISOString(),
      action: { action: 'navigate', reasoning: 'Initial navigation to target URL' },
      result: { success: true, message: `Navigated to ${url}` },
      context: { url: page.url(), title: await page.title() },
    }];

    // Save action log to database
    saveActionLog(testId, actionLogs[0]);

    // Scroll down slowly for 3 seconds
    console.log(`📜 Scrolling page for 3 seconds...`);
    const scrollDuration = 3000; // 3 seconds
    const scrollSteps = 30; // 30 steps
    const scrollAmount = 50; // pixels per step
    const stepDelay = scrollDuration / scrollSteps;

    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      await page.waitForTimeout(stepDelay);
    }

    // Add scroll action to logs
    actionLogs.push({
      timestamp: new Date().toISOString(),
      action: { action: 'scroll', reasoning: 'Scroll through page content' },
      result: { success: true, message: 'Scrolled through page for 3 seconds' },
      context: { url: page.url(), title: await page.title() },
    });

    saveActionLog(testId, actionLogs[1]);

    console.log(`✅ Test completed: ${testId}`);
    console.log(`   Website loaded and scrolled`);

    // Close the browser and end the session
    console.log(`🔄 Closing browser and ending session...`);
    await endSession(browserbaseSessionId, browser);

    // Generate report with recording URL (includes retry logic)
    console.log(`⏳ Fetching session recording URL...`);
    const report = await generateReport(testId, actionLogs, browserbaseSessionId);

    // Update status to completed
    updateTestStatus(testId, 'completed');

    // Update active session with recording URL
    const sessionData = activeSessions.get(testId);
    if (sessionData) {
      sessionData.status = 'completed';
      sessionData.completedAt = new Date().toISOString();
      sessionData.report = report;
      sessionData.recordingUrl = report.recordingUrl;
    }

    console.log(`✅ Session recording URL: ${report.recordingUrl || 'Not available yet'}`);

    console.log(`🎉 Test ${testId} finished successfully`);

    // Remove from active sessions
    activeSessions.delete(testId);

    // Process queue to start next test
    processQueue();
  } catch (error) {
    console.error(`❌ Test ${testId} failed:`, error);

    // Update status to failed
    updateTestStatus(testId, 'failed', error.message);

    // Update active session
    const session = activeSessions.get(testId);
    if (session) {
      session.status = 'failed';
      session.error = error.message;
      session.completedAt = new Date().toISOString();
    }

    // Try to end session
    if (browser) {
      try {
        await endSession(browserbaseSessionId, browser);
      } catch (cleanupError) {
        console.error('Failed to cleanup session:', cleanupError);
      }
    }

    // Remove from active sessions
    activeSessions.delete(testId);

    // Process queue to start next test
    processQueue();
  }
}

/**
 * GET /api/test/:sessionId/status
 * Get the status of a running or completed test
 */
router.get('/:testId/status', async (req, res) => {
  try {
    const { testId } = req.params;

    // Check active sessions first (for real-time updates)
    const activeSession = activeSessions.get(testId);
    if (activeSession) {
      return res.json({
        testId,
        status: activeSession.status,
        progress: activeSession.progress,
        startedAt: activeSession.startedAt,
        completedAt: activeSession.completedAt,
        recordingUrl: activeSession.recordingUrl,
      });
    }

    // Fall back to database
    const test = getTest(testId);
    if (!test) {
      return res.status(404).json({
        error: 'Test not found',
        message: `No test found with ID: ${testId}`,
      });
    }

    // Get recording URL from report if test is completed
    let recordingUrl = null;
    if (test.status === 'completed') {
      try {
        const { getReport } = await import('../database/db.js');
        const report = getReport(testId);
        if (report && report.data) {
          recordingUrl = report.data.recordingUrl;
        }
      } catch (error) {
        console.warn('Failed to get recording URL from report:', error);
      }
    }

    res.json({
      testId: test.id,
      url: test.url,
      status: test.status,
      browserbaseSessionId: test.browserbase_session_id,
      createdAt: test.created_at,
      startedAt: test.started_at,
      completedAt: test.completed_at,
      error: test.error,
      recordingUrl,
    });
  } catch (error) {
    console.error('❌ Failed to get test status:', error);
    res.status(500).json({
      error: 'Failed to get test status',
      message: error.message,
    });
  }
});

/**
 * GET /api/test/:testId/recording
 * Get the recording URL for a test (with retry logic)
 */
router.get('/:testId/recording', async (req, res) => {
  try {
    const { testId } = req.params;

    // Check if test exists
    const test = getTest(testId);
    if (!test) {
      return res.status(404).json({
        error: 'Test not found',
        message: `No test found with ID: ${testId}`,
      });
    }

    if (!test.browserbase_session_id) {
      return res.status(400).json({
        error: 'No session ID',
        message: 'Test does not have a Browserbase session ID',
      });
    }

    // Try to get recording URL with retries
    const { getRecordingUrl } = await import('../services/browserbase-service.js');
    const recordingUrl = await getRecordingUrl(test.browserbase_session_id);

    if (!recordingUrl) {
      return res.status(404).json({
        error: 'Recording not available',
        message: 'Session recording is not yet available. Please try again in a few moments.',
      });
    }

    res.json({
      testId,
      sessionId: test.browserbase_session_id,
      recordingUrl,
    });
  } catch (error) {
    console.error('❌ Failed to get recording URL:', error);
    res.status(500).json({
      error: 'Failed to get recording URL',
      message: error.message,
    });
  }
});

/**
 * GET /api/test/:sessionId/report
 * Get the test report
 */
router.get('/:testId/report', async (req, res) => {
  try {
    const { testId } = req.params;

    // Check if test exists
    const test = getTest(testId);
    if (!test) {
      return res.status(404).json({
        error: 'Test not found',
        message: `No test found with ID: ${testId}`,
      });
    }

    // Check if test is completed
    if (test.status !== 'completed') {
      return res.status(400).json({
        error: 'Test not completed',
        message: `Test is currently ${test.status}. Reports are only available for completed tests.`,
        status: test.status,
      });
    }

    // Get report
    const report = getTestReport(testId);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Test completed but report was not generated',
      });
    }

    res.json(report);
  } catch (error) {
    console.error('❌ Failed to get test report:', error);
    res.status(500).json({
      error: 'Failed to get test report',
      message: error.message,
    });
  }
});

/**
 * POST /api/test/:sessionId/stop
 * Stop a running test
 */
router.post('/:testId/stop', async (req, res) => {
  try {
    const { testId } = req.params;

    // Check if test exists
    const test = getTest(testId);
    if (!test) {
      return res.status(404).json({
        error: 'Test not found',
        message: `No test found with ID: ${testId}`,
      });
    }

    // Check if test is running
    if (test.status !== 'running') {
      return res.status(400).json({
        error: 'Test not running',
        message: `Test is currently ${test.status} and cannot be stopped.`,
        status: test.status,
      });
    }

    // Update status
    updateTestStatus(testId, 'stopped', 'Manually stopped by user');

    // Remove from active sessions
    activeSessions.delete(testId);

    // Try to end Browserbase session
    if (test.browserbase_session_id) {
      try {
        await endSession(test.browserbase_session_id);
      } catch (error) {
        console.warn('Failed to end Browserbase session:', error.message);
      }
    }

    res.json({
      testId,
      status: 'stopped',
      message: 'Test stopped successfully',
    });
  } catch (error) {
    console.error('❌ Failed to stop test:', error);
    res.status(500).json({
      error: 'Failed to stop test',
      message: error.message,
    });
  }
});

/**
 * GET /api/test/list
 * Get list of all tests
 */
router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const tests = getAllTests(limit);

    res.json({
      tests,
      count: tests.length,
    });
  } catch (error) {
    console.error('❌ Failed to get tests:', error);
    res.status(500).json({
      error: 'Failed to get tests',
      message: error.message,
    });
  }
});

export default router;
