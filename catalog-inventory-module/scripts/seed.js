const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const Product = require('../models/Product');
const Worker = require('../models/Worker');

const seedData = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/groceryDB';

  try {
    console.log('[Seed] Connecting to MongoDB at:', mongoURI);
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seed] Connected to database successfully.');

    // Load products from JSON
    const productsFilePath = path.join(__dirname, '../data/sampleProducts.json');
    const productsRaw = fs.readFileSync(productsFilePath, 'utf-8');
    const products = JSON.parse(productsRaw);

    // Initial workers data
    const initialWorkers = [
      {
        name: 'Ramesh Kumar',
        role: 'Shelf Stocker',
        contact: {
          phone: '9876543211',
          email: 'ramesh.kumar@smartgrocery.com',
        },
        assignedSection: {
          aisle: 'D1',
          section: 'Dairy & Cold Storage',
        },
        isActive: true,
      },
      {
        name: 'Priya Sharma',
        role: 'Inventory Specialist',
        contact: {
          phone: '9876543212',
          email: 'priya.sharma@smartgrocery.com',
        },
        assignedSection: {
          aisle: 'G1',
          section: 'Grains & Staples',
        },
        isActive: true,
      },
      {
        name: 'Amit Patel',
        role: 'Supervisor',
        contact: {
          phone: '9876543213',
          email: 'amit.patel@smartgrocery.com',
        },
        assignedSection: {
          aisle: 'ALL',
          section: 'Main Floor & Aisles',
        },
        isActive: true,
      },
      {
        name: 'Sunita Reddy',
        role: 'Cashier',
        contact: {
          phone: '9876543214',
          email: 'sunita.reddy@smartgrocery.com',
        },
        assignedSection: {
          aisle: 'CHECKOUT',
          section: 'Self-Billing & Express Counters',
        },
        isActive: true,
      },
    ];

    // Seed Products
    console.log('[Seed] Clearing existing products...');
    await Product.deleteMany({});
    console.log(`[Seed] Inserting ${products.length} sample products (Dairy & Basic Grocery)...`);
    const insertedProducts = await Product.insertMany(products);
    console.log(`[Seed] Successfully inserted ${insertedProducts.length} products.`);

    // Seed Workers
    console.log('[Seed] Clearing existing workers...');
    await Worker.deleteMany({});
    console.log(`[Seed] Inserting ${initialWorkers.length} sample workers...`);
    const insertedWorkers = await Worker.insertMany(initialWorkers);
    console.log(`[Seed] Successfully inserted ${insertedWorkers.length} workers.`);

    // Summary of low-stock items inserted
    const lowStockCount = insertedProducts.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    ).length;

    console.log('--------------------------------------------------');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log(`📦 Total Products: ${insertedProducts.length}`);
    console.log(`⚠️  Low Stock Products Flagged: ${lowStockCount}`);
    console.log(`👷 Total Workers: ${insertedWorkers.length}`);
    console.log('--------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedData();
