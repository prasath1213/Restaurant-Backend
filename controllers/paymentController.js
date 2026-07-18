const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { createRazorpayOrder, verifyPaymentSignature } = require('../services/razorpayService');
const { PAYMENT_STATUS, PAYMENT_METHOD, ROLES } = require('../config/constants');

/**
 * @desc    Create a Razorpay order for a given internal order, to be paid by the customer.
 * @route   POST /api/v1/payments/create-order
 * @access  Private (Customer)
 * @body    { orderId }
 */
exports.createPaymentOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId) {
    return next(new AppError('orderId is required.', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }
  if (order.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to pay for this order.', 403));
  }
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return next(new AppError('This order has already been paid for.', 400));
  }
  if (order.paymentMethod !== PAYMENT_METHOD.RAZORPAY) {
    return next(new AppError('This order is not configured for online payment.', 400));
  }

  const razorpayOrder = await createRazorpayOrder(order.totalAmount, order.orderNumber, {
    orderId: order._id.toString(),
    customerId: req.user._id.toString(),
  });

  // Create or update the Payment record tracking this attempt
  let payment = await Payment.findOne({ order: order._id });
  if (!payment) {
    payment = await Payment.create({
      order: order._id,
      customer: req.user._id,
      amount: order.totalAmount,
      method: PAYMENT_METHOD.RAZORPAY,
      status: PAYMENT_STATUS.PENDING,
      razorpayOrderId: razorpayOrder.id,
    });
  } else {
    payment.razorpayOrderId = razorpayOrder.id;
    payment.status = PAYMENT_STATUS.PENDING;
    await payment.save();
  }

  order.payment = payment._id;
  await order.save();

  sendResponse(res, 201, 'Razorpay order created successfully', {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    internalOrderId: order._id,
    orderNumber: order.orderNumber,
  });
});

/**
 * @desc    Verify a Razorpay payment after the customer completes checkout on the frontend.
 *          Validates the HMAC signature before marking the order/payment as paid.
 * @route   POST /api/v1/payments/verify
 * @access  Private (Customer)
 * @body    { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return next(new AppError('razorpayOrderId, razorpayPaymentId and razorpaySignature are all required.', 400));
  }

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    return next(new AppError('Payment record not found for this Razorpay order.', 404));
  }

  if (payment.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to verify this payment.', 403));
  }

  const isValidSignature = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

  if (!isValidSignature) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = 'Signature verification failed';
    await payment.save();

    return next(new AppError('Payment verification failed. Signature mismatch.', 400));
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order) {
    order.paymentStatus = PAYMENT_STATUS.PAID;
    await order.save();
  }

  sendResponse(res, 200, 'Payment verified successfully', { payment, order });
});

/**
 * @desc    Get payment status / details for an order
 * @route   GET /api/v1/payments/order/:orderId
 * @access  Private (Customer who owns the order, Staff, Owner)
 */
exports.getPaymentByOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  const isOwner = order.customer.toString() === req.user._id.toString();
  const isStaffOrOwner = req.user.role === ROLES.STAFF || req.user.role === ROLES.OWNER;
  if (!isOwner && !isStaffOrOwner) {
    return next(new AppError('You do not have permission to view this payment.', 403));
  }

  const payment = await Payment.findOne({ order: orderId });
  if (!payment) {
    return next(new AppError('No payment record found for this order.', 404));
  }

  sendResponse(res, 200, 'Payment fetched successfully', { payment });
});

/**
 * @desc    Mark a Razorpay payment as failed (called by frontend on payment failure callback)
 * @route   POST /api/v1/payments/failed
 * @access  Private (Customer)
 * @body    { razorpayOrderId, reason }
 */
exports.markPaymentFailed = catchAsync(async (req, res, next) => {
  const { razorpayOrderId, reason = 'Payment failed at gateway' } = req.body;

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    return next(new AppError('Payment record not found.', 404));
  }
  if (payment.customer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to update this payment.', 403));
  }

  payment.status = PAYMENT_STATUS.FAILED;
  payment.failureReason = reason;
  await payment.save();

  sendResponse(res, 200, 'Payment marked as failed', { payment });
});
