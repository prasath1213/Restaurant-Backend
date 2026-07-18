const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { ALL_ROLES, ROLES } = require('../config/constants');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Home' }, // e.g. Home, Work
    line1: { type: String, trim: true, required: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    pincode: { type: String, trim: true, required: true },
    landmark: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: 'Phone number must be exactly 10 digits',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return password by default on queries
    },
    role: {
      type: String,
      enum: {
        values: ALL_ROLES,
        message: `Role must be one of: ${ALL_ROLES.join(', ')}`,
      },
      default: ROLES.CUSTOMER,
    },
    // Only relevant for delivery staff
    vehicleNumber: {
      type: String,
      trim: true,
    },
    addresses: [addressSchema],
    isActive: {
      type: Boolean,
      default: true, // owner/admin can deactivate staff/delivery/customers
    },
    // For delivery staff: tracks whether they're currently free to be assigned an order
    isAvailableForDelivery: {
      type: Boolean,
      default: function () {
        return this.role === ROLES.DELIVERY_STAFF;
      },
    },
    passwordChangedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Index for frequent lookups by role (e.g. admin listing all delivery staff)
userSchema.index({ role: 1 });

// Hash password before saving, only if it was modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);

  // Record timestamp so tokens issued before a password change can be invalidated if desired
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

// Instance method to compare plaintext password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Returns a safe, public-facing version of the user document
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);