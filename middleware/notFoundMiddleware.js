const AppError = require('../utils/AppError');

/**
 * Catches all requests that don't match any defined route.
 * Must be registered after all routes but before the global error handler.
 */
module.exports = (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
};
