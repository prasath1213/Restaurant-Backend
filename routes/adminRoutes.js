const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect);

// Delivery staff listing is needed by both Owner (to assign) — keep narrowly scoped to Owner
router.get('/delivery-staff', restrictTo(ROLES.OWNER, ROLES.STAFF), adminController.getDeliveryStaff);

// Everything else below is Owner-only
router.use(restrictTo(ROLES.OWNER));

router.post('/users', adminController.createStaffUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deactivateUser);

router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/revenue', adminController.getRevenueReport);

module.exports = router;
