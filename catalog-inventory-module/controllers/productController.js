const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * @desc    Get all products with optional filtering & pagination
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { category, aisle, lowStock, sortBy, page = 1, limit = 50 } = req.query;

    const query = {};

    if (category) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (aisle) {
      query['location.aisle'] = aisle.trim().toUpperCase();
    }

    // Filter low stock if specified
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sortBy === 'price_asc') sortOption = { price: 1 };
    else if (sortBy === 'price_desc') sortOption = { price: -1 };
    else if (sortBy === 'name_asc') sortOption = { name: 1 };
    else if (sortBy === 'stock_asc') sortOption = { stockQuantity: 1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query).sort(sortOption).skip(skip).limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search products by name, category, or SKU (case-insensitive, partial match)
 * @route   GET /api/products/search?q=query
 * @access  Public
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q, category } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required for search (e.g., /api/products/search?q=milk)",
      });
    }

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm, 'i');

    const query = {
      $or: [{ name: regex }, { category: regex }, { sku: regex }, { description: regex }],
    };

    if (category) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    const results = await Product.find(query).limit(30);

    res.status(200).json({
      success: true,
      query: searchTerm,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product details by MongoDB _id or SKU
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product = null;

    // If param is a valid 24-char ObjectId, query by _id first
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }

    // If not found by _id, attempt lookup by SKU/barcode
    if (!product) {
      product = await Product.findOne({ sku: id.toUpperCase().trim() });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product not found with identifier '${id}'`,
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Admin / Floor Staff
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      unit,
      description,
      imageUrl,
      sku,
      location,
      stockQuantity,
      lowStockThreshold,
    } = req.body;

    // Check if SKU already exists
    const normalizedSku = sku.toUpperCase().trim();
    const existingProduct = await Product.findOne({ sku: normalizedSku });
    if (existingProduct) {
      return res.status(409).json({
        success: false,
        error: `A product with SKU '${normalizedSku}' already exists`,
      });
    }

    const product = new Product({
      name,
      category,
      price,
      unit,
      description,
      imageUrl,
      sku: normalizedSku,
      location: {
        aisle: location?.aisle ? location.aisle.trim().toUpperCase() : 'UNASSIGNED',
        shelf: location?.shelf ? location.shelf.trim() : '1',
      },
      stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
      lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
    });

    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Admin / Floor Staff
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid product ID format: '${id}'`,
      });
    }

    const updates = { ...req.body };
    if (updates.sku) {
      updates.sku = updates.sku.toUpperCase().trim();
      // Verify SKU uniqueness if changing SKU
      const duplicateSku = await Product.findOne({
        sku: updates.sku,
        _id: { $ne: id },
      });
      if (duplicateSku) {
        return res.status(409).json({
          success: false,
          error: `Another product with SKU '${updates.sku}' already exists`,
        });
      }
    }

    if (updates.location) {
      if (updates.location.aisle) {
        updates.location.aisle = updates.location.aisle.trim().toUpperCase();
      }
      if (updates.location.shelf) {
        updates.location.shelf = updates.location.shelf.trim();
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign or update a product's shelf/aisle location (For Smart Store Navigation module)
 * @route   PATCH /api/products/:id/location
 * @access  Floor Staff / Admin
 */
const updateProductLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { aisle, shelf } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid product ID format: '${id}'`,
      });
    }

    const newLocation = {
      aisle: aisle.trim().toUpperCase(),
      shelf: shelf.trim(),
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { location: newLocation },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product shelf/aisle location updated successfully',
      data: {
        id: updatedProduct._id,
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        location: updatedProduct.location,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product by ID
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid product ID format: '${id}'`,
      });
    }

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Product with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Product '${deleted.name}' deleted successfully`,
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductLocation,
  deleteProduct,
};
