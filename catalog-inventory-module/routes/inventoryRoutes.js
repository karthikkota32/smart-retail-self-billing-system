const express = require('express');
const router = express.Router();
const {
  updateStock,
  getLowStockProducts,
  getStockStatus,
} = require('../controllers/inventoryController');

const { validateStockUpdate } = require('../middleware/validator');

// List all low-stock products (stock <= threshold)
router.get('/low-stock', getLowStockProducts);

// Quick stock availability status for a product (used by Billing & Navigation)
router.get('/status/:id', getStockStatus);

// Update stock quantity (increment / decrement / set)
router.patch('/:id/stock', validateStockUpdate, updateStock);

module.exports = router;
