const mongoose = require('mongoose');

/**
 * Product Schema
 * Represents grocery items in the store catalog with stock levels
 * and physical shelf/aisle locations for navigation pathfinding.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required (e.g., kg, litre, piece)'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['kg', 'litre', 'piece', 'gram', 'ml', 'pack'],
        message: '{VALUE} is not a supported unit. Allowed: kg, litre, piece, gram, ml, pack',
      },
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60',
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU/Barcode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // Shelf/Aisle location used by the Smart Store Navigation module for pathfinding
    location: {
      aisle: {
        type: String,
        required: [true, 'Aisle location is required (e.g., A3, D1)'],
        trim: true,
        uppercase: true,
        default: 'UNASSIGNED',
      },
      shelf: {
        type: String,
        required: [true, 'Shelf level is required (e.g., 1, 2, Top, Middle)'],
        trim: true,
        default: '1',
      },
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
    },
    // Mirror fields for legacy teammate modules
    stock_quantity: {
      type: Number,
      default: function () {
        return this.stockQuantity || 0;
      },
    },
    stock: {
      type: Number,
      default: function () {
        return this.stockQuantity || 0;
      },
    },
    lowStockThreshold: {
      type: Number,
      required: [true, 'Low stock threshold is required'],
      min: [0, 'Low stock threshold cannot be negative'],
      default: 5,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to ensure stock_quantity mirrors stockQuantity
productSchema.pre('save', function (next) {
  if (this.stockQuantity !== undefined) {
    this.stock_quantity = this.stockQuantity;
    this.stock = this.stockQuantity;
  }
  next();
});

// Virtual property indicating whether stock is at or below the warning threshold
productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

// Virtual property indicating whether product is completely out of stock
productSchema.virtual('isOutOfStock').get(function () {
  return this.stockQuantity === 0;
});

// Text index to allow partial and regex search acceleration
productSchema.index({ name: 'text', category: 'text', sku: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
