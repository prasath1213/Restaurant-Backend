const AppError = require('../utils/AppError');

/**
 * Converts known Mongoose/JWT error types into clean AppError instances.
 */
const handleCastErrorDB = (err) => {
  return new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = field ? err.keyValue[field] : 'value';
  return new AppError(`Duplicate value '${value}' for field '${field}'. Please use another value.`, 409);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data: ${messages.join('. ')}`, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendProdError = (err, res) => {
  // Operational, trusted error: send a clean message to the client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Programming or unknown error: don't leak internal details
  console.error('UNEXPECTED ERROR 💥', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server. Please try again later.',
  });
};

/**
 * Global Express error-handling middleware. Must be registered LAST (after all routes).
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return sendDevError(err, res);
  }

  let error = { ...err, message: err.message, name: err.name };

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Preserve operational flag for the production sender
  if (!(error instanceof AppError)) {
    error.isOperational = err.isOperational || false;
    error.statusCode = error.statusCode || err.statusCode || 500;
  }

  sendProdError(error, res);
};
