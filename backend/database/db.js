import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'browser-tests.db');

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database tables
 */
export function initializeDatabase() {
  console.log('📦 Initializing database...');

  // Create tests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      browserbase_session_id TEXT,
      error TEXT
    )
  `);

  // Create reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      browserbase_recording_url TEXT,
      issues_count INTEGER DEFAULT 0,
      pages_visited INTEGER DEFAULT 0,
      actions_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )
  `);

  // Create action_logs table for detailed action tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target TEXT,
      value TEXT,
      reasoning TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      page_url TEXT,
      page_title TEXT,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Database initialized successfully');
  console.log(`📁 Database location: ${dbPath}`);
}

// Initialize on module load
initializeDatabase();

/**
 * Create a new test entry
 */
export function createTest(testId, url, browserbaseSessionId) {
  const stmt = db.prepare(`
    INSERT INTO tests (id, url, status, created_at, browserbase_session_id)
    VALUES (?, ?, 'pending', datetime('now'), ?)
  `);

  return stmt.run(testId, url, browserbaseSessionId);
}

/**
 * Update test status
 */
export function updateTestStatus(testId, status, error = null) {
  const now = "datetime('now')";

  if (status === 'running') {
    const stmt = db.prepare(`
      UPDATE tests
      SET status = ?, started_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(status, testId);
  } else if (status === 'completed' || status === 'failed') {
    const stmt = db.prepare(`
      UPDATE tests
      SET status = ?, completed_at = datetime('now'), error = ?
      WHERE id = ?
    `);
    return stmt.run(status, error, testId);
  } else {
    const stmt = db.prepare('UPDATE tests SET status = ? WHERE id = ?');
    return stmt.run(status, testId);
  }
}

/**
 * Get test by ID
 */
export function getTest(testId) {
  const stmt = db.prepare('SELECT * FROM tests WHERE id = ?');
  return stmt.get(testId);
}

/**
 * Get all tests
 */
export function getAllTests(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM tests
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Save action log entry
 */
export function saveActionLog(testId, actionLog) {
  const stmt = db.prepare(`
    INSERT INTO action_logs (
      test_id, timestamp, action_type, target, value, reasoning,
      success, error_message, page_url, page_title
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    testId,
    actionLog.timestamp,
    actionLog.action.action,
    actionLog.action.target || null,
    actionLog.action.value || null,
    actionLog.action.reasoning || null,
    actionLog.result.success ? 1 : 0,
    actionLog.result.error || null,
    actionLog.context.url || null,
    actionLog.context.title || null
  );
}

/**
 * Get action logs for a test
 */
export function getActionLogs(testId) {
  const stmt = db.prepare(`
    SELECT * FROM action_logs
    WHERE test_id = ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(testId);
}

/**
 * Create a test report
 */
export function createReport(testId, reportData, browserbaseRecordingUrl = null) {
  const stmt = db.prepare(`
    INSERT INTO reports (
      test_id, data_json, browserbase_recording_url,
      issues_count, pages_visited, actions_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  return stmt.run(
    testId,
    JSON.stringify(reportData),
    browserbaseRecordingUrl,
    reportData.summary?.issuesFound || 0,
    reportData.summary?.pagesVisited || 0,
    reportData.summary?.actionsPerformed || 0
  );
}

/**
 * Get report by test ID
 */
export function getReport(testId) {
  const stmt = db.prepare(`
    SELECT * FROM reports
    WHERE test_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const report = stmt.get(testId);

  if (report && report.data_json) {
    report.data = JSON.parse(report.data_json);
  }

  return report;
}

/**
 * Delete a test and all associated data
 */
export function deleteTest(testId) {
  const stmt = db.prepare('DELETE FROM tests WHERE id = ?');
  return stmt.run(testId);
}

export default db;
