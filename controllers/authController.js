const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in .env');
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // NOTE: Do NOT hash password here manually.
    // The User model's pre('save') hook already hashes it.
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'customer',
    });

    const token = generateToken(user);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // password has select:false in schema, so explicitly select it
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(user.toSafeObject());
  } catch (error) {
    console.error('GET ME ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

module.exports = { registerUser, loginUser, getMe };