const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [100, 'Food name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    foodType: {
      type: String,
      enum: ['Veg', 'Non Veg'],
      default: 'Veg',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTimeMinutes: {
      type: Number,
      default: 15,
      min: [1, 'Preparation time must be at least 1 minute'],
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Text index to support search-by-name/description; index on category+availability for menu browsing
foodSchema.index({ name: 'text', description: 'text' });
foodSchema.index({ category: 1, isAvailable: 1 });

module.exports = mongoose.model('Food', foodSchema);
