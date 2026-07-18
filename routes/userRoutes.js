const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  addStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  addDeliveryStaff,
  getDeliveryStaff,
  updateDeliveryStaff,
  deleteDeliveryStaff,
  updateDeliveryStaffAvailability,
  getCustomers,
  updateCustomerStatus,
} = require('../controllers/userController');

// All staff management routes — owner/admin only
router.post('/staff', protect, restrictTo('owner', 'admin'), addStaff);
router.get('/staff', protect, restrictTo('owner', 'admin'), getStaff);
router.put('/staff/:id', protect, restrictTo('owner', 'admin'), updateStaff);
router.delete('/staff/:id', protect, restrictTo('owner', 'admin'), deleteStaff);

// All delivery staff management routes — owner/admin only
router.post('/delivery-staff', protect, restrictTo('owner', 'admin'), addDeliveryStaff);
router.get('/delivery-staff', protect, restrictTo('owner', 'admin'), getDeliveryStaff);
router.put('/delivery-staff/:id', protect, restrictTo('owner', 'admin'), updateDeliveryStaff);
router.delete('/delivery-staff/:id', protect, restrictTo('owner', 'admin'), deleteDeliveryStaff);
router.patch(
  '/delivery-staff/:id/availability',
  protect,
  restrictTo('owner', 'admin'),
  updateDeliveryStaffAvailability
);

// Customer management routes — owner/admin only
router.get('/customers', protect, restrictTo('owner', 'admin'), getCustomers);
router.put('/customers/:id/status', protect, restrictTo('owner', 'admin'), updateCustomerStatus);

module.exports = router;