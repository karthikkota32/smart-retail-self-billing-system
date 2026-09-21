const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose ODM.
 * Uses MONGO_URI from environment variables or defaults to local MongoDB instance.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/groceryDB';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Successfully connected to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Active database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // If running in development without local mongo active, provide helpful tip
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MongoDB Tip] Ensure mongod service is running locally or provide a valid Atlas URI in .env');
    }
  }

  // Connection event handlers
  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost. Attempting to reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Runtime error: ${err.message}`);
  });
};

module.exports = connectDB;
