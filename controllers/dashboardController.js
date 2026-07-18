const Order = require('../models/Order');
const User = require('../models/User');
const Food = require('../models/Food');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const AppError = require('../utils/AppError');
const { ORDER_STATUS } = require('../config/constants');

exports.getAdminDashboard = catchAsync(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    todayOrders,
    totalCustomers,
    revenueResult,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate([
      { $match: { 'payment.status': 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name email')
      .lean(),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;

  sendResponse(res, 200, 'Dashboard data fetched', {
    stats: {
      totalOrders,
      todayOrders,
      totalCustomers,
      totalRevenue,
    },
    recentOrders,
  });
});

// @desc    Get sales report for a date range
// @route   GET /api/dashboard/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Owner only
exports.getSalesReport = catchAsync(async (req, res, next) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return next(new AppError('Both "from" and "to" query params are required (YYYY-MM-DD)', 400));
  }

  const startDate = new Date(from);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999); // include the entire "to" day

  if (isNaN(startDate) || isNaN(endDate)) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD.', 400));
  }

  // Exclude cancelled orders from sales totals
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $ne: ORDER_STATUS.CANCELLED },
  }).sort({ createdAt: 1 });

  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders ? totalSales / totalOrders : 0;

  // Group into a day-by-day breakdown for charting
  const dailyMap = {};
  orders.forEach((o) => {
    const day = o.createdAt.toISOString().split('T')[0];
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, sales: 0, orders: 0 };
    }
    dailyMap[day].sales += o.totalAmount || 0;
    dailyMap[day].orders += 1;
  });
  const dailyBreakdown = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const report = {
    from,
    to,
    totalSales,
    totalOrders,
    averageOrderValue,
    dailyBreakdown,
  };

  sendResponse(res, 200, 'Sales report generated', { report, ...report });
});