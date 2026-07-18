const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const AppError = require('../utils/AppError');

/**
 * Creates a Razorpay order. Amount must be passed in the base currency unit (e.g. rupees);
 * this function converts to the smallest unit (paise) as required by Razorpay's API.
 *
 * @param {number} amount amount in rupees
 * @param {string} receipt a unique receipt identifier (we use our internal orderNumber)
 * @param {object} notes optional metadata to attach to the Razorpay order
 */
const createRazorpayOrder = async (amount, receipt, notes = {}) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt,
      notes,
    };
    const razorpayOrder = await razorpayInstance.orders.create(options);
    return razorpayOrder;
  } catch (error) {
    // Razorpay SDK errors often nest the real message under error.error.description
    const description = error?.error?.description || error.message || 'Unknown Razorpay error';
    throw new AppError(`Failed to create Razorpay order: ${description}`, 502);
  }
};

/**
 * Verifies the HMAC SHA256 signature Razorpay sends after a successful payment,
 * confirming the payment genuinely originated from Razorpay and wasn't tampered with.
 *
 * Formula per Razorpay docs: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

/**
 * Verifies a Razorpay webhook signature (X-Razorpay-Signature header).
 * Separate from payment signature verification — used for the optional webhook endpoint.
 */
const verifyWebhookSignature = (rawBody, signature, webhookSecret) => {
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expectedSignature === signature;
};

module.exports = { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature };
