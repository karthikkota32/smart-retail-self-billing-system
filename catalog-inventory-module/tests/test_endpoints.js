/**
 * Automated Verification Script for Product Catalog & Inventory Module
 * Run with: node tests/test_endpoints.js
 * (Make sure the server is running on http://localhost:5001 or configure BASE_URL)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { status: res.status, body };
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Catalog & Inventory API Verification Suite`);
  console.log(`🎯 Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let createdProductId = null;
  let testSku = `TEST-SKU-${Date.now()}`;
  let createdWorkerId = null;

  try {
    // 1. Health Check
    console.log('[Test 1] Health Check');
    const health = await request('/health');
    assert(health.status === 200 && health.body?.status === 'healthy', 'GET /health returns 200 healthy');

    // 2. List All Products
    console.log('\n[Test 2] List All Products');
    const productsRes = await request('/api/products');
    assert(productsRes.status === 200, 'GET /api/products returns status 200');
    assert(Array.isArray(productsRes.body?.data), 'Product data is an array');
    assert(productsRes.body?.count > 0, `Returned ${productsRes.body?.count} products`);

    // 3. Create Product
    console.log('\n[Test 3] Create Product');
    const createRes = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Organic Almond Milk 1L',
        category: 'Dairy',
        price: 180.0,
        unit: 'litre',
        description: 'Cold-pressed unsweetened almond beverage',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
        sku: testSku,
        location: {
          aisle: 'D3',
          shelf: '1',
        },
        stockQuantity: 20,
        lowStockThreshold: 5,
      }),
    });
    assert(createRes.status === 201, 'POST /api/products returns status 201 Created');
    assert(createRes.body?.data?.sku === testSku, 'Created product has correct SKU');
    createdProductId = createRes.body?.data?._id;

    // 4. Duplicate SKU Rejection
    console.log('\n[Test 4] Duplicate SKU Rejection (409 Conflict)');
    const dupRes = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Item',
        category: 'Dairy',
        price: 100,
        unit: 'piece',
        sku: testSku,
      }),
    });
    assert(dupRes.status === 409, 'Duplicate SKU rejected with 409 Conflict');

    // 5. Search Products by Query
    console.log('\n[Test 5] Search Products');
    const searchRes = await request('/api/products/search?q=Milk');
    assert(searchRes.status === 200, 'GET /api/products/search?q=Milk returns 200');
    assert(searchRes.body?.data?.length > 0, `Search matched ${searchRes.body?.data?.length} items`);

    // 6. Get Product by ID and by SKU
    console.log('\n[Test 6] Get Single Product');
    const getByIdRes = await request(`/api/products/${createdProductId}`);
    assert(getByIdRes.status === 200, 'GET /api/products/:id by ObjectId returns 200');
    assert(getByIdRes.body?.data?.name === 'Organic Almond Milk 1L', 'Fetched product matches created name');

    const getBySkuRes = await request(`/api/products/${testSku}`);
    assert(getBySkuRes.status === 200, 'GET /api/products/:sku by SKU string returns 200');
    assert(getBySkuRes.body?.data?._id === createdProductId, 'Fetched by SKU returns correct document');

    // 7. Update Shelf/Aisle Location (Navigation Integration)
    console.log('\n[Test 7] Update Shelf/Aisle Location (Smart Store Navigation)');
    const locRes = await request(`/api/products/${createdProductId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({
        aisle: 'D4',
        shelf: '2',
      }),
    });
    assert(locRes.status === 200, 'PATCH /api/products/:id/location returns 200');
    assert(
      locRes.body?.data?.location?.aisle === 'D4' && locRes.body?.data?.location?.shelf === '2',
      'Location updated to aisle D4, shelf 2'
    );

    // 8. Stock Management: Increment Restock
    console.log('\n[Test 8] Stock Management - Restock (Increment)');
    const incRes = await request(`/api/inventory/${createdProductId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'increment',
        amount: 10,
      }),
    });
    assert(incRes.status === 200, 'PATCH /api/inventory/:id/stock increment returns 200');
    assert(incRes.body?.data?.currentStock === 30, 'Current stock increased from 20 to 30');

    // 9. Stock Management: Decrement Sale
    console.log('\n[Test 9] Stock Management - Sale (Decrement)');
    const decRes = await request(`/api/inventory/${createdProductId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'decrement',
        amount: 27, // 30 - 27 = 3 (threshold is 5, triggers low-stock!)
      }),
    });
    assert(decRes.status === 200, 'PATCH /api/inventory/:id/stock decrement returns 200');
    assert(decRes.body?.data?.currentStock === 3, 'Current stock decreased to 3');
    assert(decRes.body?.data?.isLowStock === true, 'Low-stock flag automatically enabled (3 <= 5)');

    // 10. Stock Management: Insufficient Stock Rejection (Billing Protection)
    console.log('\n[Test 10] Stock Insufficient Deduction Rejection');
    const overDecRes = await request(`/api/inventory/${createdProductId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'decrement',
        amount: 10, // currently 3 in stock, cannot deduct 10
      }),
    });
    assert(overDecRes.status === 400, 'Deduction exceeding available stock rejected with 400 Bad Request');

    // 11. Low-Stock Query
    console.log('\n[Test 11] Low-Stock Products List');
    const lowStockRes = await request('/api/inventory/low-stock');
    assert(lowStockRes.status === 200, 'GET /api/inventory/low-stock returns 200');
    assert(Array.isArray(lowStockRes.body?.data), 'Low stock data is an array');
    const foundCreatedInLowStock = lowStockRes.body?.data?.some((p) => p._id === createdProductId);
    assert(foundCreatedInLowStock, 'Newly depleted product appears in low-stock list');

    // 12. Stock Status Endpoint
    console.log('\n[Test 12] Inventory Status');
    const statusRes = await request(`/api/inventory/status/${testSku}`);
    assert(statusRes.status === 200, 'GET /api/inventory/status/:id returns 200');
    assert(statusRes.body?.data?.inStock === true, 'Product reported as inStock');
    assert(statusRes.body?.data?.isLowStock === true, 'Product reported as isLowStock');

    // 13. Worker Management CRUD
    console.log('\n[Test 13] Worker Management');
    const workerEmail = `test.worker.${Date.now()}@smartgrocery.com`;
    const workerPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

    const createWorkerRes = await request('/api/workers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Kavita Joshi',
        role: 'Shelf Stocker',
        contact: {
          phone: workerPhone,
          email: workerEmail,
        },
        assignedSection: {
          aisle: 'D1',
          section: 'Dairy Section',
        },
      }),
    });
    assert(createWorkerRes.status === 201, 'POST /api/workers returns 201 Created');
    createdWorkerId = createWorkerRes.body?.data?._id;

    const listWorkersRes = await request('/api/workers');
    assert(listWorkersRes.status === 200, 'GET /api/workers returns 200');
    assert(listWorkersRes.body?.count > 0, `Returned ${listWorkersRes.body?.count} workers`);

    const updateWorkerRes = await request(`/api/workers/${createdWorkerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: 'Supervisor',
        assignedSection: {
          aisle: 'ALL',
          section: 'Supervisory Floor',
        },
      }),
    });
    assert(updateWorkerRes.status === 200, 'PUT /api/workers/:id returns 200');
    assert(updateWorkerRes.body?.data?.role === 'Supervisor', 'Worker role updated');

    const deleteWorkerRes = await request(`/api/workers/${createdWorkerId}`, {
      method: 'DELETE',
    });
    assert(deleteWorkerRes.status === 200, 'DELETE /api/workers/:id returns 200');

    // 14. Cleanup Test Product
    console.log('\n[Test 14] Delete Product');
    const deleteRes = await request(`/api/products/${createdProductId}`, {
      method: 'DELETE',
    });
    assert(deleteRes.status === 200, 'DELETE /api/products/:id returns 200');

    // Summary
    console.log(`\n======================================================`);
    console.log(`🏁 Verification Finished:`);
    console.log(`   Passed: ${testsPassed}`);
    console.log(`   Failed: ${testsFailed}`);
    console.log(`======================================================\n`);

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runTests();
