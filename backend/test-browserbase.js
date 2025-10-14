import dotenv from 'dotenv';
import { createSession, getSessionStatus, endSession } from './services/browserbase-service.js';

dotenv.config();

async function testBrowserbaseService() {
  console.log('🧪 Testing Browserbase Service...\n');

  try {
    // Test 1: Create Session
    console.log('Test 1: Creating Browserbase session...');
    const { sessionId, liveViewUrl } = await createSession();
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`📺 Live view: ${liveViewUrl}\n`);

    // Test 2: Get Session Status
    console.log('Test 2: Getting session status...');
    const status = await getSessionStatus(sessionId);
    console.log(`✅ Status: ${status.status}`);
    console.log(`📊 Session details:`, JSON.stringify(status, null, 2), '\n');

    // Test 3: End Session
    console.log('Test 3: Ending session...');
    await endSession(sessionId);
    console.log('✅ Session ended successfully\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBrowserbaseService();
