import db from '../database/db.js';
import { endSession } from '../services/browserbase-service.js';
import { getTest, getAllTests, updateTestStatus } from '../database/db.js';

/**
 * Cleanup handler for graceful shutdown
 */
export async function cleanupOnExit() {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    // Find all running tests
    const tests = getAllTests(100);
    const runningTests = tests.filter(test => test.status === 'running' || test.status === 'starting');

    if (runningTests.length > 0) {
      console.log(`📋 Found ${runningTests.length} running tests to cleanup`);

      for (const test of runningTests) {
        try {
          console.log(`  Cleaning up test ${test.id}...`);

          // Update status to stopped
          updateTestStatus(test.id, 'stopped', 'Server shutdown');

          // Try to end Browserbase session
          if (test.browserbase_session_id) {
            try {
              await endSession(test.browserbase_session_id);
              console.log(`  ✅ Ended Browserbase session for test ${test.id}`);
            } catch (error) {
              console.warn(`  ⚠️  Failed to end session: ${error.message}`);
            }
          }
        } catch (error) {
          console.error(`  ❌ Failed to cleanup test ${test.id}:`, error.message);
        }
      }
    }

    // Close database connection
    db.close();
    console.log('✅ Database closed');

    console.log('✅ Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

/**
 * Register cleanup handlers
 */
export function registerCleanupHandlers() {
  // Handle process termination
  process.on('SIGTERM', cleanupOnExit);
  process.on('SIGINT', cleanupOnExit);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    cleanupOnExit();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });

  console.log('✅ Cleanup handlers registered');
}
