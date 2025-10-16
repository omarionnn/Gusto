import { chromium } from 'playwright';
import { browserbase } from '../server.js';

/**
 * Create a new Browserbase session
 * @returns {Promise<{sessionId: string, liveViewUrl: string, debugUrl: string}>}
 */
export async function createSession() {
  try {
    const session = await browserbase.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        recordSession: true,  // Enable session recording
      },
    });

    console.log('✅ Created Browserbase session:', session.id);
    console.log('📹 Session recording enabled');

    return {
      sessionId: session.id,
      liveViewUrl: session.liveUrls?.liveUrl || `https://browserbase.com/sessions/${session.id}`,
      debugUrl: session.debugUrl || null,
    };
  } catch (error) {
    console.error('❌ Failed to create Browserbase session:', error);
    throw new Error(`Failed to create Browserbase session: ${error.message}`);
  }
}

/**
 * Connect Playwright to an existing Browserbase session
 * @param {string} sessionId - The Browserbase session ID
 * @returns {Promise<{browser: import('playwright').Browser, context: import('playwright').BrowserContext, page: import('playwright').Page}>}
 */
export async function connectPlaywright(sessionId) {
  const maxRetries = 20;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get the session details to retrieve the WebSocket debugger URL
      const session = await browserbase.sessions.retrieve(sessionId);

      // Log session details for debugging
      if (attempt === 1) {
        console.log('📋 Session details:', {
          id: session.id,
          status: session.status,
          hasConnectUrl: !!session.connectUrl,
          hasDebuggerUrl: !!session.debuggerUrl,
          hasDebugUrl: !!session.debugUrl,
        });
      }

      // Browserbase uses connectUrl for WebSocket connection
      const connectUrl = session.connectUrl || session.debuggerUrl || session.debugUrl;

      if (!connectUrl) {
        if (attempt < maxRetries) {
          console.log(`⏳ Connect URL not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        console.error('❌ Final session state:', session);
        throw new Error('Session connect URL not available after retries');
      }

      console.log('🔌 Connecting Playwright to Browserbase session via WebSocket:', sessionId);

      // Connect to the remote browser using CDP over WebSocket
      const browser = await chromium.connectOverCDP(connectUrl);

      // Get the default context and page
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext();

      const pages = context.pages();
      const page = pages[0] || await context.newPage();

      console.log('✅ Playwright connected successfully');

      return { browser, context, page };
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('❌ Failed to connect Playwright to Browserbase:', error);
        throw new Error(`Failed to connect Playwright: ${error.message}`);
      }

      // If it's not a URL availability issue, retry
      console.log(`⚠️  Connection attempt ${attempt}/${maxRetries} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * End a Browserbase session
 * @param {string} sessionId - The Browserbase session ID
 * @param {import('playwright').Browser} [browser] - Optional browser instance to close first
 * @returns {Promise<void>}
 */
export async function endSession(sessionId, browser = null) {
  try {
    // Close the browser connection first if provided
    if (browser) {
      try {
        await browser.close();
        console.log('✅ Closed browser connection');
      } catch (error) {
        console.warn('⚠️  Failed to close browser:', error.message);
      }
    }

    // Stop the session on Browserbase (use update, not complete)
    try {
      await browserbase.sessions.update(sessionId, {
        status: 'REQUEST_RELEASE',
      });
      console.log('✅ Ended Browserbase session:', sessionId);
    } catch (updateError) {
      // If update doesn't work, just log it - the session will expire automatically
      console.warn('⚠️  Could not stop session, it will expire automatically:', updateError.message);
    }
  } catch (error) {
    console.error('❌ Failed to end Browserbase session:', error);
    // Don't throw - session will clean up automatically
    console.log('ℹ️  Session will expire automatically');
  }
}

/**
 * Get session status and details
 * @param {string} sessionId - The Browserbase session ID
 * @returns {Promise<any>}
 */
export async function getSessionStatus(sessionId) {
  try {
    const session = await browserbase.sessions.retrieve(sessionId);
    return {
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      projectId: session.projectId,
      liveViewUrl: session.liveUrls?.liveUrl,
      debugUrl: session.debugUrl,
      recordingUrl: `https://browserbase.com/sessions/${sessionId}`,
    };
  } catch (error) {
    console.error('❌ Failed to get session status:', error);
    throw new Error(`Failed to get session status: ${error.message}`);
  }
}

/**
 * Get the recording URL for a completed session
 * Browserbase recordings are available at: https://browserbase.com/sessions/{sessionId}
 * @param {string} sessionId - The Browserbase session ID
 * @param {number} maxRetries - Maximum number of retries to check if session is completed
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Promise<string|null>}
 */
export async function getRecordingUrl(sessionId, maxRetries = 5, retryDelay = 2000) {
  // Browserbase recordings are accessible via a simple URL pattern
  // The recording becomes available after the session is completed

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const session = await browserbase.sessions.retrieve(sessionId);

      // Log session details on first attempt to debug
      if (attempt === 1) {
        console.log('📋 Session status:', session.status);
      }

      // Check if session is completed (recording should be available)
      if (session.status === 'COMPLETED' || session.endedAt) {
        const recordingUrl = `https://browserbase.com/sessions/${sessionId}`;
        console.log(`✅ Recording URL available:`, recordingUrl);
        return recordingUrl;
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Session not completed yet (status: ${session.status}, attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`❌ Failed to get session status (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Even if session is not marked as completed, return the URL anyway
  // The recording might still be available
  const recordingUrl = `https://browserbase.com/sessions/${sessionId}`;
  console.log('⚠️  Session not completed after retries, but recording may still be available at:', recordingUrl);
  return recordingUrl;
}
