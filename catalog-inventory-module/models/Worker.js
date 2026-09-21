const mongoose = require('mongoose');

/**
 * Worker Schema
 * Represents grocery store employees/workers who manage shelves,
 * restocking, checkout, and assigned store sections.
 */
const workerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      enum: {
        values: [
          'Store Associate',
          'Inventory Specialist',
          'Shelf Stocker',
          'Cashier',
          'Supervisor',
          'Store Manager',
        ],
        message: '{VALUE} is not a valid worker role',
      },
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Contact phone number is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Contact email is required'],
        trim: true,
        lowercase: true,
      },
    },
    assignedSection: {
      aisle: {
        type: String,
        default: 'General',
        trim: true,
        uppercase: true,
      },
      section: {
        type: String,
        default: 'Store Floor',
        trim: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
