const VALID_CATEGORIES = [
  'Starters',
  'Main Course',
  'Breads',
  'Rice & Biryani',
  'Desserts',
  'Beverages',
  'Salads',
  'Soups',
  'Fast Food',
  'Combos',
];

const validateCreateFood = (body) => {
  const errors = [];
  const { name, price, category, isVeg } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Food name is required');
  }
  if (price === undefined || price === null || isNaN(price) || Number(price) < 0) {
    errors.push('Price must be a valid non-negative number');
  }
  if (!category) {
    errors.push('Category is required');
  }
  if (isVeg !== undefined && typeof isVeg !== 'boolean') {
    errors.push('isVeg must be true or false');
  }

  return errors;
};

const validateUpdateFood = (body) => {
  const errors = [];
  const { price, category, isVeg } = body;

  if (price !== undefined && (isNaN(price) || Number(price) < 0)) {
    errors.push('Price must be a valid non-negative number');
  }
  // Allow any category during update
  if (category !== undefined && typeof category !== 'string') {
    errors.push('Category must be a string');
  }
  if (isVeg !== undefined && typeof isVeg !== 'boolean') {
    errors.push('isVeg must be true or false');
  }

  return errors;
};

module.exports = { validateCreateFood, validateUpdateFood, VALID_CATEGORIES };