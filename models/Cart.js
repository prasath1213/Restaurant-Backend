const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [50, 'Quantity cannot exceed 50 per item'],
      default: 1,
    },
    // Snapshot of price at time of adding, used for display only;
    // the authoritative price is always re-fetched from Food at checkout.
    priceSnapshot: {
      type: Number,
      required: true,
    },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one active cart per customer
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// Virtual: cart subtotal computed from snapshot prices (for quick display; checkout re-validates)
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
});

cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
