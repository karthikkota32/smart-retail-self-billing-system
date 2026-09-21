const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductLocation,
  deleteProduct,
} = require('../controllers/productController');

const {
  validateProductCreate,
  validateProductUpdate,
  validateLocationUpdate,
} = require('../middleware/validator');

// Search endpoint - Must precede /:id to prevent route shadowing
router.get('/search', searchProducts);

// Collection endpoints
router.route('/')
  .get(getAllProducts)
  .post(validateProductCreate, createProduct);

// Specific shelf/aisle location update (For Smart Store Navigation module)
router.patch('/:id/location', validateLocationUpdate, updateProductLocation);

// Item endpoints
router.route('/:id')
  .get(getProductById)
  .put(validateProductUpdate, updateProduct)
  .delete(deleteProduct);

module.exports = router;
