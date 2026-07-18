const User = require('../models/User');
const { ROLES } = require('../config/constants');

// @desc    Add a new staff member
// @route   POST /api/users/staff
// @access  Owner/Admin only
exports.addStaff = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are all required',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const staff = await User.create({
      name,
      email,
      phone,
      password, // pre-save hook in User model hashes this automatically
      role: ROLES.STAFF,
    });

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      data: staff.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to add staff member',
    });
  }
};

// @desc    Get all staff members
// @route   GET /api/users/staff
// @access  Owner/Admin only
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: ROLES.STAFF });
    res.status(200).json({
      success: true,
      count: staff.length,
      staff,
      data: staff,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch staff',
    });
  }
};

// @desc    Update a staff member
// @route   PUT /api/users/staff/:id
// @access  Owner/Admin only
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, phone, isActive } = req.body;

    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: ROLES.STAFF },
      { name, email, phone, isActive },
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff member updated',
      data: staff,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update staff member',
    });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/users/staff/:id
// @access  Owner/Admin only
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findOneAndDelete({
      _id: req.params.id,
      role: ROLES.STAFF,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff member deleted',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete staff member',
    });
  }
};

// @desc    Add a new delivery staff member
// @route   POST /api/users/delivery-staff
// @access  Owner/Admin only
exports.addDeliveryStaff = async (req, res) => {
  try {
    const { name, email, phone, password, vehicleNumber } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are all required',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const deliveryStaff = await User.create({
      name,
      email,
      phone,
      password, // pre-save hook in User model hashes this automatically
      vehicleNumber,
      role: ROLES.DELIVERY_STAFF,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery staff member added successfully',
      data: deliveryStaff.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to add delivery staff member',
    });
  }
};

// @desc    Get all delivery staff members
// @route   GET /api/users/delivery-staff
// @access  Owner/Admin only
exports.getDeliveryStaff = async (req, res) => {
  try {
    const deliveryStaff = await User.find({ role: ROLES.DELIVERY_STAFF });
    res.status(200).json({
      success: true,
      count: deliveryStaff.length,
      staff: deliveryStaff,
      data: deliveryStaff,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch delivery staff',
    });
  }
};

// @desc    Update a delivery staff member
// @route   PUT /api/users/delivery-staff/:id
// @access  Owner/Admin only
exports.updateDeliveryStaff = async (req, res) => {
  try {
    const { name, email, phone, vehicleNumber, isActive, isAvailableForDelivery } = req.body;

    const deliveryStaff = await User.findOneAndUpdate(
      { _id: req.params.id, role: ROLES.DELIVERY_STAFF },
      { name, email, phone, vehicleNumber, isActive, isAvailableForDelivery },
      { new: true, runValidators: true }
    );

    if (!deliveryStaff) {
      return res.status(404).json({
        success: false,
        message: 'Delivery staff member not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery staff member updated',
      data: deliveryStaff,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update delivery staff member',
    });
  }
};

// @desc    Toggle a delivery staff member's availability
// @route   PATCH /api/users/delivery-staff/:id/availability
// @access  Owner/Admin only
exports.updateDeliveryStaffAvailability = async (req, res) => {
  try {
    const { isAvailableForDelivery } = req.body;

    const deliveryStaff = await User.findOne({
      _id: req.params.id,
      role: ROLES.DELIVERY_STAFF,
    });

    if (!deliveryStaff) {
      return res.status(404).json({
        success: false,
        message: 'Delivery staff member not found',
      });
    }

    // If no explicit value sent, toggle the current value
    deliveryStaff.isAvailableForDelivery =
      typeof isAvailableForDelivery === 'boolean'
        ? isAvailableForDelivery
        : !deliveryStaff.isAvailableForDelivery;

    await deliveryStaff.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated',
      data: deliveryStaff.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update availability',
    });
  }
};

// @desc    Delete a delivery staff member
// @route   DELETE /api/users/delivery-staff/:id
// @access  Owner/Admin only
exports.deleteDeliveryStaff = async (req, res) => {
  try {
    const deliveryStaff = await User.findOneAndDelete({
      _id: req.params.id,
      role: ROLES.DELIVERY_STAFF,
    });

    if (!deliveryStaff) {
      return res.status(404).json({
        success: false,
        message: 'Delivery staff member not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery staff member deleted',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete delivery staff member',
    });
  }
};

// @desc    Get all customers
// @route   GET /api/users/customers?limit=100
// @access  Owner/Admin only
exports.getCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;

    const customers = await User.find({ role: ROLES.CUSTOMER })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: customers.length,
      customers,
      staff: customers,
      data: customers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch customers',
    });
  }
};

// @desc    Activate/deactivate a customer account
// @route   PUT /api/users/customers/:id/status
// @access  Owner/Admin only
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: ROLES.CUSTOMER },
      { isActive },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer status updated',
      data: customer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update customer status',
    });
  }
};