const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Food = require('../models/Food');
const User = require('../models/User');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { calculateOrderPricing, generateOrderNumber } = require('../services/pricingService');
const { canTransition } = require('../services/orderStatusService');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD, ROLES } = require('../config/constants');

/**
 * Helper to emit a real-time order status update to anyone tracking this order
 * (customer joins room `order_<id>` via socket.emit('trackOrder', orderId)).
 */
const emitOrderUpdate = (req, order, extra = {}) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`order_${order._id}`).emit('orderStatusUpdate', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    updatedAt: new Date(),
    ...extra,
  });
};

/**
 * @desc    Create a new order from the customer's current cart (checkout step).
 *          For Razorpay flow, the order is created with paymentStatus=Pending;
 *          the actual Razorpay order + verification happens in paymentController.
 * @route   POST /api/v1/orders
 * @access  Private (Customer)
 */
exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    items: requestedItems,
    deliveryAddress,
    paymentMethod = PAYMENT_METHOD.RAZORPAY,
    customerNote = '',
  } = req.body;

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return next(new AppError('Your cart is empty. Add items before checking out.', 400));
  }

  // Re-validate each item against the live Food collection (authoritative price + availability)
  const orderItems = [];
  for (const requestedItem of requestedItems) {
    const food = await Food.findById(requestedItem.food);
    if (!food) {
      return next(new AppError('One or more items in your cart no longer exist.', 400));
    }
    if (!food.isAvailable) {
      return next(new AppError(`'${food.name}' is currently unavailable. Please remove it from your cart.`, 400));
    }
    orderItems.push({
      food: food._id,
      name: food.name,
      price: food.price,
      quantity: requestedItem.quantity,
    });
  }

  const { itemsTotal, deliveryFee, taxAmount, totalAmount } = calculateOrderPricing(orderItems);

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    customer: req.user._id,
    items: orderItems,
    deliveryAddress,
    itemsTotal,
    deliveryFee,
    taxAmount,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === PAYMENT_METHOD.COD ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PENDING,
    status: ORDER_STATUS.PLACED,
    customerNote,
  });

  order.pushStatusHistory(ORDER_STATUS.PLACED, req.user._id, 'Order placed by customer');
  await order.save();

  // 🔴 Emit initial status so a customer who opens the tracking screen
  // right after checkout immediately sees "Placed"
  emitOrderUpdate(req, order);

  sendResponse(res, 201, 'Order created successfully', { order });
});

/**
 * @desc    Get all orders for the logged-in customer
 * @route   GET /api/v1/orders/my-orders
 * @access  Private (Customer)
 */
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { customer: req.user._id };
  if (status) filter.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip(skip).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Orders fetched successfully', { orders }, {
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

/**
 * @desc    Get all orders in the system (staff/owner dashboard view)
 * @route   GET /api/v1/orders
 * @access  Private (Staff, Owner)
 * Query: status, page, limit
 */
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('assignedDeliveryStaff', 'name phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Orders fetched successfully', { orders }, {
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

/**
 * @desc    Get orders assigned to the logged-in delivery staff
 * @route   GET /api/v1/orders/my-deliveries
 * @access  Private (Delivery Staff)
 */
exports.getMyDeliveries = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const filter = { assignedDeliveryStaff: req.user._id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('customer', 'name phone')
    .sort('-createdAt');

  sendResponse(res, 200, 'Deliveries fetched successfully', { orders });
});

/**
 * @desc    Get a single order by ID (with role-based access check)
 * @route   GET /api/v1/orders/:id
 * @access  Private (Customer who owns it, Staff, Delivery Staff assigned, Owner)
 */
exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('assignedDeliveryStaff', 'name phone')
    .populate('handledByStaff', 'name')
    .populate('payment');

  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  const { role, _id: userId } = req.user;
  const isOwnerOfOrder = order.customer._id.toString() === userId.toString();
  const isAssignedDelivery =
    order.assignedDeliveryStaff && order.assignedDeliveryStaff._id.toString() === userId.toString();
  const isStaffOrOwner = role === ROLES.STAFF || role === ROLES.OWNER;

  if (!isOwnerOfOrder && !isAssignedDelivery && !isStaffOrOwner) {
    return next(new AppError('You do not have permission to view this order.', 403));
  }

  sendResponse(res, 200, 'Order fetched successfully', { order });
});

/**
 * Generic internal helper to apply a validated status transition.
 * `req` is passed so we can access the Socket.io instance via req.app.get('io')
 * and emit a real-time update to whoever is tracking this order.
 */
const applyStatusTransition = async (req, order, toStatus, user, extraFields = {}, note = '') => {
  const { allowed, reason } = canTransition(order.status, toStatus, user.role);
  if (!allowed) {
    throw new AppError(reason, 400);
  }

  order.status = toStatus;
  Object.assign(order, extraFields);
  order.pushStatusHistory(toStatus, user._id, note);
  await order.save();

  // 🔴 Real-time push to anyone tracking this order
  emitOrderUpdate(req, order, { note });

  return order;
};

/**
 * @desc    Staff accepts a placed order
 * @route   PATCH /api/v1/orders/:id/accept
 * @access  Private (Staff, Owner)
 */
exports.acceptOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.ACCEPTED,
    req.user,
    { handledByStaff: req.user._id },
    'Order accepted by staff'
  );

  sendResponse(res, 200, 'Order accepted successfully', { order });
});

/**
 * @desc    Mark order as preparing
 * @route   PATCH /api/v1/orders/:id/preparing
 * @access  Private (Staff, Owner)
 */
exports.markPreparing = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  await applyStatusTransition(req, order, ORDER_STATUS.PREPARING, req.user, {}, 'Order is being prepared');

  sendResponse(res, 200, 'Order marked as preparing', { order });
});

/**
 * @desc    Mark order as ready for delivery
 * @route   PATCH /api/v1/orders/:id/ready
 * @access  Private (Staff, Owner)
 */
exports.markReadyForDelivery = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.READY_FOR_DELIVERY,
    req.user,
    {},
    'Order is ready for pickup by delivery staff'
  );

  sendResponse(res, 200, 'Order marked as ready for delivery', { order });
});

/**
 * @desc    Owner assigns a delivery staff member to a ready order
 * @route   PATCH /api/v1/orders/:id/assign-delivery
 * @access  Private (Owner)
 */
exports.assignDeliveryStaff = catchAsync(async (req, res, next) => {
  const { deliveryStaffId } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  const allowedForAssignment = [ORDER_STATUS.PLACED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY_FOR_DELIVERY];
  if (!allowedForAssignment.includes(order.status)) {
    return next(
      new AppError(`Delivery staff cannot be assigned while order is '${order.status}'.`, 400)
    );
  }

  const deliveryStaff = await User.findOne({ _id: deliveryStaffId, role: ROLES.DELIVERY_STAFF });
  if (!deliveryStaff) {
    return next(new AppError('Delivery staff member not found.', 404));
  }
  if (!deliveryStaff.isActive) {
    return next(new AppError('This delivery staff member is not active.', 400));
  }

  order.assignedDeliveryStaff = deliveryStaff._id;
  order.assignedAt = new Date();
  order.pushStatusHistory(order.status, req.user._id, `Assigned to delivery staff: ${deliveryStaff.name}`);
  await order.save();

  // 🔴 Status unchanged here, but customer UI can still show "delivery partner assigned"
  emitOrderUpdate(req, order, { deliveryStaffAssigned: deliveryStaff.name });

  sendResponse(res, 200, 'Delivery staff assigned successfully', { order });
});

/**
 * @desc    Delivery staff picks up the order and marks it out for delivery
 * @route   PATCH /api/v1/orders/:id/pickup
 * @access  Private (Delivery Staff, Owner)
 */
exports.pickupOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  if (
    req.user.role === ROLES.DELIVERY_STAFF &&
    (!order.assignedDeliveryStaff || order.assignedDeliveryStaff.toString() !== req.user._id.toString())
  ) {
    return next(new AppError('This order is not assigned to you.', 403));
  }

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    req.user,
    { pickedUpAt: new Date(), outForDeliveryAt: new Date() },
    'Order picked up and is now out for delivery'
  );

  sendResponse(res, 200, 'Order picked up — now out for delivery', { order });
});

/**
 * @desc    Mark order as delivered
 * @route   PATCH /api/v1/orders/:id/delivered
 * @access  Private (Delivery Staff, Owner)
 */
exports.markDelivered = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  if (
    req.user.role === ROLES.DELIVERY_STAFF &&
    (!order.assignedDeliveryStaff || order.assignedDeliveryStaff.toString() !== req.user._id.toString())
  ) {
    return next(new AppError('This order is not assigned to you.', 403));
  }

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.DELIVERED,
    req.user,
    { deliveredAt: new Date() },
    'Order delivered to customer'
  );

  // For COD orders, mark payment as paid once delivered
  if (order.paymentMethod === PAYMENT_METHOD.COD && order.paymentStatus === PAYMENT_STATUS.PENDING) {
    order.paymentStatus = PAYMENT_STATUS.PAID;
    await order.save();
  }

  sendResponse(res, 200, 'Order marked as delivered', { order });
});

/**
 * @desc    Mark order as completed (final confirmation step, typically by customer)
 * @route   PATCH /api/v1/orders/:id/complete
 * @access  Private (Customer who owns it, Staff, Owner)
 */
exports.completeOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  if (req.user.role === ROLES.CUSTOMER && order.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to complete this order.', 403));
  }

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.COMPLETED,
    req.user,
    { completedAt: new Date() },
    'Order completed'
  );

  sendResponse(res, 200, 'Order marked as completed', { order });
});

/**
 * @desc    Cancel an order (only allowed in early stages)
 * @route   PATCH /api/v1/orders/:id/cancel
 * @access  Private (Customer who owns it, Staff, Owner)
 */
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { reason = '' } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  if (req.user.role === ROLES.CUSTOMER && order.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to cancel this order.', 403));
  }

  await applyStatusTransition(
    req,
    order,
    ORDER_STATUS.CANCELLED,
    req.user,
    { cancelledAt: new Date(), cancellationReason: reason },
    `Order cancelled: ${reason}`
  );

  sendResponse(res, 200, 'Order cancelled successfully', { order });
});