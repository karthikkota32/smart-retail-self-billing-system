const express = require('express');
const router = express.Router();
const {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
} = require('../controllers/workerController');

const { validateWorkerCreate } = require('../middleware/validator');

router.route('/')
  .get(getAllWorkers)
  .post(validateWorkerCreate, createWorker);

router.route('/:id')
  .get(getWorkerById)
  .put(updateWorker)
  .delete(deleteWorker);

module.exports = router;
