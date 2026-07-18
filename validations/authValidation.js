const validator = require('validator');
const { ALL_ROLES } = require('../config/constants');

/**
 * Pure validation functions for auth-related requests.
 * Each returns an array of error message strings (empty array = valid).
 */
const validateRegister = (body) => {
  const errors = [];
  const { name, email, phone, password, role } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    errors.push('A valid email address is required');
  }
  if (!phone || typeof phone !== 'string' || !/^[0-9]{10}$/.test(phone)) {
    errors.push('Phone number must be exactly 10 digits');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (role && !ALL_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${ALL_ROLES.join(', ')}`);
  }

  return errors;
};

const validateLogin = (body) => {
  const errors = [];
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
    errors.push('A valid email address is required');
  }
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  return errors;
};

const validateUpdatePassword = (body) => {
  const errors = [];
  const { currentPassword, newPassword } = body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    errors.push('Current password is required');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    errors.push('New password must be at least 8 characters long');
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('New password must be different from current password');
  }

  return errors;
};

module.exports = { validateRegister, validateLogin, validateUpdatePassword };