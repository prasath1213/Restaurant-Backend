const User = require('../models/User');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * @desc    Owner creates a new staff / delivery staff / owner account
 * @route   POST /api/v1/admin/users
 * @access  Private (Owner)
 */
exports.createStaffUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (![ROLES.STAFF, ROLES.DELIVERY_STAFF, ROLES.OWNER].includes(role)) {
    return next(new AppError(`Role must be one of: ${ROLES.STAFF}, ${ROLES.DELIVERY_STAFF}, ${ROLES.OWNER}`, 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, phone, password, role });

  sendResponse(res, 201, `${role} account created successfully`, { user: user.toSafeObject() });
});

/**
 * @desc    Get all users, optionally filtered by role
 * @route   GET /api/v1/admin/users
 * @access  Private (Owner)
 * Query: role, isActive, page, limit
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limitNum),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Users fetched successfully', { users }, {
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

/**
 * @desc    Get a single user's details by ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (Owner)
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }
  sendResponse(res, 200, 'User fetched successfully', { user });
});

/**
 * @desc    Update a user's details (role, active status, etc.) — admin management
 * @route   PATCH /api/v1/admin/users/:id
 * @access  Private (Owner)
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'phone', 'role', 'isActive', 'isAvailableForDelivery'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.role && !Object.values(ROLES).includes(updates.role)) {
    return next(new AppError('Invalid role specified.', 400));
  }

  // Prevent an owner from accidentally deactivating/demoting themselves into a lockout
  if (req.params.id === req.user._id.toString() && (updates.isActive === false || updates.role)) {
    return next(new AppError('You cannot change your own role or deactivate your own account.', 400));
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  sendResponse(res, 200, 'User updated successfully', { user });
});

/**
 * @desc    Deactivate (soft-delete) a user account
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private (Owner)
 */
exports.deactivateUser = catchAsync(async (req, res, next) => {
  if (req.params.id === req.user._id.toString()) {
    return next(new AppError('You cannot deactivate your own account.', 400));
  }

  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  sendResponse(res, 200, 'User deactivated successfully', { user });
});

/**
 * @desc    Get list of all delivery staff (optionally filter by availability)
 * @route   GET /api/v1/admin/delivery-staff
 * @access  Private (Owner, Staff)
 */
exports.getDeliveryStaff = catchAsync(async (req, res, next) => {
  const { available } = req.query;
  const filter = { role: ROLES.DELIVERY_STAFF, isActive: true };
  if (available !== undefined) filter.isAvailableForDelivery = available === 'true';

  const deliveryStaff = await User.find(filter).select('name email phone isAvailableForDelivery');

  sendResponse(res, 200, 'Delivery staff fetched successfully', { deliveryStaff });
});

/**
 * @desc    Sales report — order counts grouped by status within an optional date range
 * @route   GET /api/v1/admin/reports/sales
 * @access  Private (Owner)
 * Query: startDate, endDate
 */
exports.getSalesReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [statusBreakdown, totalOrders, dailyTrend] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Order.countDocuments(match),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  sendResponse(res, 200, 'Sales report generated successfully', {
    totalOrders,
    statusBreakdown,
    dailyTrend,
  });
});

/**
 * @desc    Revenue report — total revenue, average order value, breakdown by payment status
 * @route   GET /api/v1/admin/reports/revenue
 * @access  Private (Owner)
 * Query: startDate, endDate
 */
exports.getRevenueReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const match = { paymentStatus: PAYMENT_STATUS.PAID };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [summary, dailyRevenue, topFoods] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalItemsRevenue: { $sum: '$itemsTotal' },
          totalDeliveryFees: { $sum: '$deliveryFee' },
          totalTax: { $sum: '$taxAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const revenueSummary = summary[0] || {
    totalRevenue: 0,
    totalItemsRevenue: 0,
    totalDeliveryFees: 0,
    totalTax: 0,
    orderCount: 0,
    avgOrderValue: 0,
  };

  sendResponse(res, 200, 'Revenue report generated successfully', {
    summary: revenueSummary,
    dailyRevenue,
    topSellingFoods: topFoods,
  });
});
