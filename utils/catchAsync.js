/**
 * Wraps an async controller function so any rejected promise / thrown error
 * is automatically forwarded to Express's error-handling middleware via next().
 * This removes the need for try/catch blocks in every controller.
 *
 * Usage: exports.someController = catchAsync(async (req, res, next) => { ... });
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
