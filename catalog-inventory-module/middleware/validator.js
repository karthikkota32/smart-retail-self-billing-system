const { body, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation result and return standard 400 response
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Input validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for creating a product
 */
const validateProductCreate = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('unit')
    .trim()
    .toLowerCase()
    .isIn(['kg', 'litre', 'piece', 'gram', 'ml', 'pack'])
    .withMessage('Unit must be one of: kg, litre, piece, gram, ml, pack'),
  body('sku').trim().notEmpty().withMessage('SKU/Barcode is required'),
  body('description').optional().trim(),
  body('imageUrl').optional().trim().isURL().withMessage('imageUrl must be a valid URL'),
  body('location.aisle').optional().trim().notEmpty().withMessage('Aisle cannot be empty if location provided'),
  body('location.shelf').optional().trim().notEmpty().withMessage('Shelf cannot be empty if location provided'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stockQuantity must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('lowStockThreshold must be a non-negative integer'),
  validate,
];

/**
 * Validation rules for updating a product
 */
const validateProductUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('unit')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['kg', 'litre', 'piece', 'gram', 'ml', 'pack'])
    .withMessage('Unit must be one of: kg, litre, piece, gram, ml, pack'),
  body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
  body('description').optional().trim(),
  body('imageUrl').optional().trim(),
  body('location.aisle').optional().trim().notEmpty().withMessage('Aisle cannot be empty'),
  body('location.shelf').optional().trim().notEmpty().withMessage('Shelf cannot be empty'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stockQuantity must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('lowStockThreshold must be a non-negative integer'),
  validate,
];

/**
 * Validation rules for updating shelf/aisle location
 */
const validateLocationUpdate = [
  body('aisle').trim().notEmpty().withMessage('Aisle is required (e.g., A3, D1)'),
  body('shelf').trim().notEmpty().withMessage('Shelf is required (e.g., 1, 2)'),
  validate,
];

/**
 * Validation rules for stock update
 */
const validateStockUpdate = [
  body('action')
    .isIn(['increment', 'decrement', 'set'])
    .withMessage("Action must be either 'increment', 'decrement', or 'set'"),
  body('amount')
    .isInt({ min: 0 })
    .withMessage('Amount must be a non-negative integer'),
  validate,
];

/**
 * Validation rules for Worker creation & update
 */
const validateWorkerCreate = [
  body('name').trim().notEmpty().withMessage('Worker name is required'),
  body('role')
    .trim()
    .isIn([
      'Store Associate',
      'Inventory Specialist',
      'Shelf Stocker',
      'Cashier',
      'Supervisor',
      'Store Manager',
    ])
    .withMessage('Invalid worker role'),
  body('contact.phone').trim().notEmpty().withMessage('Worker contact phone is required'),
  body('contact.email').trim().isEmail().withMessage('Valid worker email is required'),
  body('assignedSection.aisle').optional().trim(),
  body('assignedSection.section').optional().trim(),
  validate,
];

module.exports = {
  validateProductCreate,
  validateProductUpdate,
  validateLocationUpdate,
  validateStockUpdate,
  validateWorkerCreate,
};
