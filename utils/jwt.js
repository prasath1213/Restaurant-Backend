const jwt = require('jsonwebtoken');

/**
 * Signs a new JWT for a given user id and role.
 * Keeping the payload minimal (id + role) avoids leaking sensitive data inside the token,
 * since JWT payloads are base64-encoded, NOT encrypted, and can be decoded by anyone.
 */
const signToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if invalid/expired — caller (auth middleware) is expected to catch this.
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
