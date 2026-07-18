const express = require('express');
const router = express.Router();
const { getAdminDashboard, getSalesReport } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

router.get('/admin', protect, restrictTo(ROLES.OWNER), getAdminDashboard);
router.get('/reports/sales', protect, restrictTo(ROLES.OWNER), getSalesReport);

module.exports = router;