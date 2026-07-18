/**
 * Custom error class for operational errors (expected errors we throw deliberately,
 * e.g. validation failures, not-found resources, unauthorized access).
 * Distinguishing these from programming errors lets the global error handler
 * decide whether to leak the message to the client or hide it.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
