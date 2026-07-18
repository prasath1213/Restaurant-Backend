const express = require('express');
const cartController = require('../controllers/cartController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { validateAddToCart, validateUpdateCartItem } = require('../validations/cartValidation');
const { ROLES } = require('../config/constants');

const router = express.Router();

// All cart routes require login and customer role
router.use(protect, restrictTo(ROLES.CUSTOMER));

router.get('/', cartController.getCart);
router.post('/', validate(validateAddToCart), cartController.addToCart);
router.delete('/', cartController.clearCart);
router.patch('/:itemId', validate(validateUpdateCartItem), cartController.updateCartItem);
router.delete('/:itemId', cartController.removeCartItem);

module.exports = router;
