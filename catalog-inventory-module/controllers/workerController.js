const mongoose = require('mongoose');
const Worker = require('../models/Worker');

/**
 * @desc    List all workers (with optional role or aisle filtering)
 * @route   GET /api/workers
 * @access  Admin
 */
const getAllWorkers = async (req, res, next) => {
  try {
    const { role, aisle, isActive } = req.query;

    const query = {};
    if (role) {
      query.role = { $regex: new RegExp(`^${role.trim()}$`, 'i') };
    }
    if (aisle) {
      query['assignedSection.aisle'] = aisle.trim().toUpperCase();
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single worker by ID
 * @route   GET /api/workers/:id
 * @access  Admin
 */
const getWorkerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid worker ID format: '${id}'`,
      });
    }

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: `Worker not found with ID '${id}'`,
      });
    }

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new store worker
 * @route   POST /api/workers
 * @access  Admin
 */
const createWorker = async (req, res, next) => {
  try {
    const { name, role, contact, assignedSection, isActive } = req.body;

    // Check for existing worker with the same phone or email
    const existingWorker = await Worker.findOne({
      $or: [{ 'contact.phone': contact?.phone?.trim() }, { 'contact.email': contact?.email?.trim().toLowerCase() }],
    });

    if (existingWorker) {
      return res.status(409).json({
        success: false,
        error: 'A worker with this phone number or email already exists',
      });
    }

    const worker = new Worker({
      name: name.trim(),
      role: role.trim(),
      contact: {
        phone: contact.phone.trim(),
        email: contact.email.trim().toLowerCase(),
      },
      assignedSection: {
        aisle: assignedSection?.aisle ? assignedSection.aisle.trim().toUpperCase() : 'GENERAL',
        section: assignedSection?.section ? assignedSection.section.trim() : 'Store Floor',
      },
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedWorker = await worker.save();

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully',
      data: savedWorker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update worker information or aisle/section assignment
 * @route   PUT /api/workers/:id
 * @access  Admin
 */
const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid worker ID format: '${id}'`,
      });
    }

    const updates = { ...req.body };
    if (updates.assignedSection?.aisle) {
      updates.assignedSection.aisle = updates.assignedSection.aisle.trim().toUpperCase();
    }
    if (updates.contact?.email) {
      updates.contact.email = updates.contact.email.trim().toLowerCase();
    }

    const updatedWorker = await Worker.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedWorker) {
      return res.status(404).json({
        success: false,
        error: `Worker with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Worker details updated successfully',
      data: updatedWorker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a worker
 * @route   DELETE /api/workers/:id
 * @access  Admin
 */
const deleteWorker = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid worker ID format: '${id}'`,
      });
    }

    const deleted = await Worker.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Worker with ID '${id}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Worker '${deleted.name}' deleted successfully`,
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
};
