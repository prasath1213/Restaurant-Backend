const express = require('express');
const foodController = require('../controllers/foodController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { validateCreateFood, validateUpdateFood } = require('../validations/foodValidation');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Public — anyone can browse the menu

// IMPORTANT: /categories must be registered BEFORE /:id,
// otherwise Express matches "categories" as the :id param.
router.get('/categories', foodController.getCategories);

router.get('/', foodController.getAllFoods);
router.get('/:id', foodController.getFoodById);

// Protected — only staff/owner can manage the menu
router.use(protect);

router.post('/', restrictTo(ROLES.STAFF, ROLES.OWNER), validate(validateCreateFood), foodController.createFood);
router.patch('/:id', restrictTo(ROLES.STAFF, ROLES.OWNER), validate(validateUpdateFood), foodController.updateFood);
router.delete('/:id', restrictTo(ROLES.OWNER), foodController.deleteFood);

module.exports = router;