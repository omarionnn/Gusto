import { createReport, getReport, saveActionLog, getActionLogs } from '../database/db.js';
import { getRecordingUrl } from './browserbase-service.js';

/**
 * Generate a comprehensive test report from action logs
 * @param {string} testId - Test ID
 * @param {Array} actionLogs - Array of action log entries
 * @param {string} browserbaseSessionId - Browserbase session ID
 * @returns {Promise<Object>} - Generated report
 */
export async function generateReport(testId, actionLogs, browserbaseSessionId) {
  try {
    console.log('📊 Generating test report...');

    // Get the recording URL
    const recordingUrl = await getRecordingUrl(browserbaseSessionId);

    // Extract unique pages visited
    const pagesVisited = [...new Set(actionLogs.map(log => log.context?.url).filter(Boolean))];

    // Build navigation path
    const navigationPath = actionLogs
      .filter(log => log.context?.url)
      .map((log, index) => ({
        step: index + 1,
        url: log.context.url,
        title: log.context.title || 'Unknown',
        timestamp: log.timestamp,
      }));

    // Identify issues
    const issues = [];

    // Check for failed actions
    actionLogs.forEach((log, index) => {
      if (!log.result.success) {
        issues.push({
          severity: 'error',
          type: 'action_failed',
          message: `Failed to ${log.action.action}: ${log.result.error || log.result.message}`,
          timestamp: log.timestamp,
          page: log.context.url,
          details: {
            action: log.action.action,
            target: log.action.target,
            error: log.result.error,
          },
        });
      }
    });

    // Build actions timeline
    const actionsTimeline = actionLogs.map((log, index) => ({
      step: index + 1,
      timestamp: log.timestamp,
      action: log.action.action,
      target: log.action.target,
      value: log.action.value,
      reasoning: log.action.reasoning,
      success: log.result.success,
      message: log.result.message,
      page: {
        url: log.context.url,
        title: log.context.title,
      },
    }));

    // Calculate duration
    const startTime = actionLogs[0]?.timestamp;
    const endTime = actionLogs[actionLogs.length - 1]?.timestamp;
    const duration = startTime && endTime
      ? new Date(endTime) - new Date(startTime)
      : 0;

    // Performance metrics
    const performanceMetrics = {
      totalDuration: duration,
      averageActionTime: actionLogs.length > 0 ? duration / actionLogs.length : 0,
      successRate: actionLogs.length > 0
        ? (actionLogs.filter(log => log.result.success).length / actionLogs.length) * 100
        : 0,
    };

    // Build the complete report
    const report = {
      testId,
      browserbaseSessionId,
      recordingUrl,
      timestamp: new Date().toISOString(),
      summary: {
        pagesVisited: pagesVisited.length,
        actionsPerformed: actionLogs.length,
        issuesFound: issues.length,
        duration: duration,
        successRate: performanceMetrics.successRate.toFixed(2) + '%',
      },
      navigationPath,
      pagesVisited,
      actionsTimeline,
      issues,
      performanceMetrics,
    };

    // Save to database
    createReport(testId, report, recordingUrl);

    console.log('✅ Report generated successfully');
    console.log(`   Pages visited: ${pagesVisited.length}`);
    console.log(`   Actions performed: ${actionLogs.length}`);
    console.log(`   Issues found: ${issues.length}`);

    return report;
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    throw new Error(`Report generation failed: ${error.message}`);
  }
}

/**
 * Get an existing report for a test
 * @param {string} testId - Test ID
 * @returns {Object|null} - Report data or null if not found
 */
export function getTestReport(testId) {
  try {
    const report = getReport(testId);

    if (!report) {
      return null;
    }

    // Include AI summary if available
    const reportData = report.data;
    if (report.summary) {
      try {
        reportData.aiSummary = JSON.parse(report.summary);
      } catch (parseError) {
        console.warn('Failed to parse AI summary:', parseError);
      }
    }

    return reportData;
  } catch (error) {
    console.error('❌ Failed to get report:', error);
    throw new Error(`Failed to retrieve report: ${error.message}`);
  }
}

/**
 * Save action logs to database during test execution
 * @param {string} testId - Test ID
 * @param {Array} actionLogs - Action logs to save
 */
export function saveTestActionLogs(testId, actionLogs) {
  try {
    actionLogs.forEach(log => {
      saveActionLog(testId, log);
    });
    console.log(`✅ Saved ${actionLogs.length} action logs for test ${testId}`);
  } catch (error) {
    console.error('❌ Failed to save action logs:', error);
    throw new Error(`Failed to save action logs: ${error.message}`);
  }
}

/**
 * Get action logs from database for a test
 * @param {string} testId - Test ID
 * @returns {Array} - Action logs
 */
export function getTestActionLogs(testId) {
  try {
    return getActionLogs(testId);
  } catch (error) {
    console.error('❌ Failed to get action logs:', error);
    throw new Error(`Failed to retrieve action logs: ${error.message}`);
  }
}

/**
 * Export report as JSON
 * @param {string} testId - Test ID
 * @returns {string} - JSON string
 */
export function exportReportAsJSON(testId) {
  const report = getTestReport(testId);
  if (!report) {
    throw new Error('Report not found');
  }
  return JSON.stringify(report, null, 2);
}
