const Cart = require('../models/Cart');
const Food = require('../models/Food');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

/**
 * Helper to fetch (or lazily create) the current user's cart, populated with food details.
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

/**n
 * @desc    Get the logged-in customer's cart
 * @route   GET /api/v1/cart
 * @access  Private (Customer)
 */
exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await getOrCreateCart(req.user._id);
  await cart.populate('items.food', 'name price imageUrl isAvailable category');

  sendResponse(res, 200, 'Cart fetched successfully', { cart });
});

/**
 * @desc    Add a food item to cart (or increment quantity if already present)
 * @route   POST /api/v1/cart
 * @access  Private (Customer)
 */
exports.addToCart = catchAsync(async (req, res, next) => {
  const { foodId, quantity = 1 } = req.body;

  const food = await Food.findById(foodId);
  if (!food) {
    return next(new AppError('Food item not found.', 404));
  }
  if (!food.isAvailable) {
    return next(new AppError('This food item is currently unavailable.', 400));
  }

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find((item) => item.food.toString() === foodId);

  if (existingItem) {
    existingItem.quantity += Number(quantity);
    existingItem.priceSnapshot = food.price; // refresh snapshot to current price
  } else {
    cart.items.push({ food: food._id, quantity: Number(quantity), priceSnapshot: food.price });
  }

  await cart.save();
  await cart.populate('items.food', 'name price imageUrl isAvailable category');

  sendResponse(res, 200, 'Item added to cart', { cart });
});

/**
 * @desc    Update quantity of a specific cart item
 * @route   PATCH /api/v1/cart/:itemId
 * @access  Private (Customer)
 */
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError('Cart not found.', 404));
  }

  const item = cart.items.find((i) => i._id.toString() === itemId);
  if (!item) {
    return next(new AppError('Cart item not found.', 404));
  }

  item.quantity = Number(quantity);
  await cart.save();
  await cart.populate('items.food', 'name price imageUrl isAvailable category');

  sendResponse(res, 200, 'Cart item updated successfully', { cart });
});

/**
 * @desc    Remove a single item from cart
 * @route   DELETE /api/v1/cart/:itemId
 * @access  Private (Customer)
 */
exports.removeCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError('Cart not found.', 404));
  }

  const itemExists = cart.items.some((i) => i._id.toString() === itemId);
  if (!itemExists) {
    return next(new AppError('Cart item not found.', 404));
  }

  cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
  await cart.save();
  await cart.populate('items.food', 'name price imageUrl isAvailable category');

  sendResponse(res, 200, 'Item removed from cart', { cart });
});

/**
 * @desc    Clear all items from the cart
 * @route   DELETE /api/v1/cart
 * @access  Private (Customer)
 */
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError('Cart not found.', 404));
  }

  cart.items = [];
  await cart.save();

  sendResponse(res, 200, 'Cart cleared successfully', { cart });
});
