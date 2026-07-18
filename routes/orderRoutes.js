const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { validateCreateOrder, validateAssignDeliveryStaff } = require('../validations/orderValidation');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect); // every order route requires authentication

// Customer routes
router.post('/', restrictTo(ROLES.CUSTOMER), validate(validateCreateOrder), orderController.createOrder);
router.get('/my-orders', restrictTo(ROLES.CUSTOMER), orderController.getMyOrders);

// Delivery staff routes
router.get('/my-deliveries', restrictTo(ROLES.DELIVERY_STAFF, ROLES.OWNER), orderController.getMyDeliveries);

// Staff/Owner — view all orders (dashboard)
router.get('/', restrictTo(ROLES.STAFF, ROLES.OWNER), orderController.getAllOrders);

// Shared — fetch single order (access control enforced inside controller)
router.get('/:id', orderController.getOrderById);

// Workflow transitions
router.patch('/:id/accept', restrictTo(ROLES.STAFF, ROLES.OWNER), orderController.acceptOrder);
router.patch('/:id/preparing', restrictTo(ROLES.STAFF, ROLES.OWNER), orderController.markPreparing);
router.patch('/:id/ready', restrictTo(ROLES.STAFF, ROLES.OWNER), orderController.markReadyForDelivery);
router.patch(
  '/:id/assign-delivery',
  restrictTo(ROLES.OWNER),
  validate(validateAssignDeliveryStaff),
  orderController.assignDeliveryStaff
);
router.patch('/:id/pickup', restrictTo(ROLES.DELIVERY_STAFF, ROLES.OWNER), orderController.pickupOrder);
router.patch('/:id/delivered', restrictTo(ROLES.DELIVERY_STAFF, ROLES.OWNER), orderController.markDelivered);
router.patch(
  '/:id/complete',
  restrictTo(ROLES.CUSTOMER, ROLES.STAFF, ROLES.OWNER),
  orderController.completeOrder
);
router.patch(
  '/:id/cancel',
  restrictTo(ROLES.CUSTOMER, ROLES.STAFF, ROLES.OWNER),
  orderController.cancelOrder
);

module.exports = router;
