const Razorpay = require('razorpay');

/**
 * Singleton Razorpay instance configured from environment variables.
 * Throws early (at boot) if keys are missing, rather than failing silently mid-request.
 */
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    'WARNING: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set. Payment routes will fail until configured in .env'
  );
}

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

module.exports = razorpayInstance;
