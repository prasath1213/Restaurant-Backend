const AppError = require('../utils/AppError');

/**
 * Generic validation-runner middleware factory.
 * Accepts a validator function (req) => string[] of error messages.
 * If any errors are found, short-circuits with a 400 AppError; otherwise calls next().
 *
 * This pattern keeps validation logic in /validations/*.js as pure functions,
 * and keeps this middleware reusable across all routes.
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    const errors = validatorFn(req.body, req.params, req.query) || [];
    if (errors.length > 0) {
      return next(new AppError(`Validation failed: ${errors.join(' | ')}`, 400));
    }
    next();
  };
};

module.exports = validate;
