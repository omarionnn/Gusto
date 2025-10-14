import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Browserbase from '@browserbasehq/sdk';
import testRoutes from './routes/test-routes.js';
import './database/db.js'; // Initialize database
import { errorHandler, notFoundHandler, requestLogger, timeoutMiddleware } from './middleware/error-handler.js';
import { registerCleanupHandlers } from './utils/cleanup.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Register cleanup handlers for graceful shutdown
registerCleanupHandlers();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(timeoutMiddleware(300000)); // 5 minute timeout for long-running tests

// Initialize Browserbase client
export const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Browser Testing Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount test routes
app.use('/api/test', testRoutes);

// Test Browserbase connection
app.get('/api/test-connection', async (req, res) => {
  try {
    // Simple test to verify Browserbase credentials
    const response = await browserbase.sessions.list({ projectId: process.env.BROWSERBASE_PROJECT_ID });
    res.json({
      status: 'connected',
      message: 'Browserbase connection successful',
      sessionsCount: response.length || 0
    });
  } catch (error) {
    console.error('Browserbase connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Browserbase',
      error: error.message
    });
  }
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);

  // Verify environment variables
  const requiredEnvVars = ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID', 'ANTHROPIC_API_KEY'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('   Please copy .env.example to .env and fill in your API keys');
  } else {
    console.log('✅ All required environment variables are set');
  }
});

export default app;
