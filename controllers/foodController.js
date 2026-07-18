const Food = require('../models/Food');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

/**
 * @desc    Add a new food item to the menu
 * @route   POST /api/v1/foods
 * @access  Private (Staff, Owner)
 */
exports.createFood = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    price,
    category,
    imageUrl,
    foodType,
    isAvailable,
    preparationTimeMinutes,
  } = req.body;

  const food = await Food.create({
    name,
    description,
    price,
    category,
    imageUrl,
    foodType,
    isAvailable,
    preparationTimeMinutes,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, 'Food item created successfully', { food });
});

/**
 * @desc    Get all food items
 * @route   GET /api/v1/foods
 * @access  Public
 */
exports.getAllFoods = catchAsync(async (req, res, next) => {
  const {
    category,
    foodType,
    isAvailable,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (foodType) {
    filter.foodType = foodType;
  }

  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === 'true';
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [foods, total] = await Promise.all([
    Food.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum),

    Food.countDocuments(filter),
  ]);

  sendResponse(
    res,
    200,
    'Foods fetched successfully',
    { foods },
    {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    }
  );
});

/**
 * @desc    Get food categories
 * @route   GET /api/v1/foods/categories
 * @access  Public
 */
exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Food.distinct('category');

  const cleaned = categories.filter(Boolean).sort();

  sendResponse(res, 200, 'Categories fetched successfully', {
    categories: cleaned,
  });
});

/**
 * @desc    Get single food
 * @route   GET /api/v1/foods/:id
 * @access  Public
 */
exports.getFoodById = catchAsync(async (req, res, next) => {
  const food = await Food.findById(req.params.id);

  if (!food) {
    return next(new AppError('Food item not found.', 404));
  }

  sendResponse(res, 200, 'Food fetched successfully', { food });
});

/**
 * @desc    Update food
 * @route   PATCH /api/v1/foods/:id
 * @access  Private
 */
exports.updateFood = catchAsync(async (req, res, next) => {
  const allowedFields = [
    'name',
    'description',
    'price',
    'category',
    'imageUrl',
    'foodType',
    'isAvailable',
    'preparationTimeMinutes',
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const food = await Food.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!food) {
    return next(new AppError('Food item not found.', 404));
  }

  sendResponse(res, 200, 'Food updated successfully', { food });
});

/**
 * @desc    Delete food
 * @route   DELETE /api/v1/foods/:id
 * @access  Private (Owner)
 */
exports.deleteFood = catchAsync(async (req, res, next) => {
  const food = await Food.findByIdAndDelete(req.params.id);

  if (!food) {
    return next(new AppError('Food item not found.', 404));
  }

  sendResponse(res, 200, 'Food deleted successfully');
});