const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../config/constants');

const orderItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    name: { type: String, required: true }, // snapshot, in case food is later edited/deleted
    price: { type: Number, required: true }, // snapshot at time of order
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    itemsTotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, default: 0, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
    },
    statusHistory: [statusHistorySchema],

    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.RAZORPAY,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },

    // Staff who accepted/is preparing the order
    handledByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Delivery staff assigned by owner
    assignedDeliveryStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: Date,
    pickedUpAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,

    customerNote: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ assignedDeliveryStaff: 1, status: 1 });

// Helper to push a status change into history; controllers call this then save()
orderSchema.methods.pushStatusHistory = function (status, changedBy, note = '') {
  this.statusHistory.push({ status, changedBy, changedAt: new Date(), note });
};

module.exports = mongoose.model('Order', orderSchema);
