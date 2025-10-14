/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // Log error details
  console.error('Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Could not connect to external service',
    });
  }

  // Rate limit errors
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter,
    });
  }

  // Generic error response
  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? '❌' : '✅';

    console.log(
      `${logLevel} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Timeout middleware
 */
export function timeoutMiddleware(timeoutMs = 120000) {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      const err = new Error('Request timeout');
      err.statusCode = 408;
      next(err);
    });

    res.setTimeout(timeoutMs, () => {
      const err = new Error('Response timeout');
      err.statusCode = 504;
      next(err);
    });

    next();
  };
}
