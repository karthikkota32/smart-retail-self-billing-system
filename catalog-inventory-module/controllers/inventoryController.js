const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * @desc    Update product stock quantity (increment on restock, decrement on sale, or set)
 * @route   PATCH /api/inventory/:id/stock
 * @access  Staff / Billing Module
 */
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, amount } = req.body;

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a non-negative integer',
      });
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ sku: id.toUpperCase().trim() });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product not found with identifier '${id}'`,
      });
    }

    const previousStock = product.stockQuantity;
    let newStock = previousStock;

    if (action === 'increment') {
      newStock = previousStock + numAmount;
    } else if (action === 'decrement') {
      if (previousStock < numAmount) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for '${product.name}'. Available: ${previousStock}, Requested deduction: ${numAmount}`,
          availableStock: previousStock,
          requestedAmount: numAmount,
        });
      }
      newStock = previousStock - numAmount;
    } else if (action === 'set') {
      newStock = numAmount;
    } else {
      return res.status(400).json({
        success: false,
        error: "Action must be 'increment', 'decrement', or 'set'",
      });
    }

    product.stockQuantity = newStock;
    await product.save();

    const isLowStock = product.stockQuantity <= product.lowStockThreshold;

    res.status(200).json({
      success: true,
      message: `Stock updated successfully via ${action}`,
      data: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        previousStock,
        currentStock: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        isLowStock,
        isOutOfStock: product.stockQuantity === 0,
        actionTaken: action,
        amountChanged: numAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products where stockQuantity <= lowStockThreshold
 * @route   GET /api/inventory/low-stock
 * @access  Admin / Inventory Manager
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const { category } = req.query;

    const matchConditions = [
      { $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] } },
    ];

    if (category) {
      matchConditions.push({
        category: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
      });
    }

    const lowStockItems = await Product.find({ $and: matchConditions }).sort({
      stockQuantity: 1,
    });

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      timestamp: new Date().toISOString(),
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stock status for a single product (used by Billing & Navigation)
 * @route   GET /api/inventory/status/:id
 * @access  Public / Billing Module
 */
const getStockStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
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
      data: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        unit: product.unit,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        inStock: product.stockQuantity > 0,
        isLowStock: product.stockQuantity <= product.lowStockThreshold,
        location: product.location,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateStock,
  getLowStockProducts,
  getStockStatus,
};
