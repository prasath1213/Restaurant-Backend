const express = require('express');
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

router.post('/create-order', restrictTo(ROLES.CUSTOMER), paymentController.createPaymentOrder);
router.post('/verify', restrictTo(ROLES.CUSTOMER), paymentController.verifyPayment);
router.post('/failed', restrictTo(ROLES.CUSTOMER), paymentController.markPaymentFailed);
router.get(
  '/order/:orderId',
  restrictTo(ROLES.CUSTOMER, ROLES.STAFF, ROLES.OWNER),
  paymentController.getPaymentByOrder
);

module.exports = router;
