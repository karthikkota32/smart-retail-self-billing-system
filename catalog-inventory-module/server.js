const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:5000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to enable parallel module development
    },
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    module: 'Product Catalog & Inventory Module',
    timestamp: new Date().toISOString(),
  });
});

// Mount Module Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/workers', require('./routes/workerRoutes'));

// Error handling middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;

let server;
// Don't listen when running unit tests or in Vercel serverless functions
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Catalog & Inventory Module running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Products API:  http://localhost:${PORT}/api/products`);
    console.log(`📦 Inventory API: http://localhost:${PORT}/api/inventory`);
    console.log(`👷 Workers API:   http://localhost:${PORT}/api/workers`);
    console.log(`🏥 Health Check:  http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

// Export both default app (for Vercel serverless) and named object (for tests)
module.exports = app;
module.exports.app = app;
module.exports.server = server;
