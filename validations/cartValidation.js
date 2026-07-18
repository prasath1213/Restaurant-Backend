const mongoose = require('mongoose');

const validateAddToCart = (body) => {
  const errors = [];
  const { foodId, quantity } = body;

  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    errors.push('A valid foodId is required');
  }
  if (quantity !== undefined && (isNaN(quantity) || Number(quantity) < 1)) {
    errors.push('Quantity must be at least 1');
  }

  return errors;
};

const validateUpdateCartItem = (body) => {
  const errors = [];
  const { quantity } = body;

  if (quantity === undefined || isNaN(quantity) || Number(quantity) < 1) {
    errors.push('Quantity must be a number of at least 1');
  }

  return errors;
};

module.exports = { validateAddToCart, validateUpdateCartItem };
