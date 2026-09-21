# Product Catalog & Inventory Module

A standalone, production-ready RESTful backend service built for the **Smart Grocery Store** web application using **Node.js, Express.js, and MongoDB (Mongoose ODM)**.

This module is designed to operate independently while providing clean, reliable API contracts for three collaborating team modules:
- 🗺️ **Smart Store Navigation Module**: Relies on standardized shelf/aisle location coordinates (`location: { aisle, shelf }`) for in-store pathfinding.
- 💳 **Billing & Invoice Module**: Queries product details and executes atomic stock deductions during checkout with negative inventory guards.
- 🏷️ **Coupons/Offers & Admin Dashboard**: Consumes low-stock alerts (`GET /api/inventory/low-stock`) and store worker assignments.

---

## 📁 Folder Structure

```
catalog-inventory-module/
├── .env.example              # Environment variables template
├── .env                      # Active local environment variables
├── package.json              # Service configuration & npm scripts
├── server.js                 # Express application entrypoint & middleware setup
├── config/
│   └── db.js                 # Mongoose connection manager with reconnection logic
├── models/
│   ├── Product.js            # Product Mongoose schema, validation & indexes
│   └── Worker.js             # Worker schema for store staff & section assignments
├── controllers/
│   ├── productController.js  # Catalog CRUD, multi-field search, location updater
│   ├── inventoryController.js# Stock increment/decrement, low-stock filter, status check
│   └── workerController.js   # Store worker management CRUD
├── routes/
│   ├── productRoutes.js      # Routes for /api/products
│   ├── inventoryRoutes.js    # Routes for /api/inventory
│   └── workerRoutes.js       # Routes for /api/workers
├── middleware/
│   ├── errorHandler.js       # Centralized error responses (400, 404, 409, 500)
│   └── validator.js          # Input validation schemas using express-validator
├── data/
│   └── sampleProducts.json   # 20 curated seed items (Dairy & Basic Grocery)
├── scripts/
│   └── seed.js               # Database population script (npm run seed)
├── tests/
│   ├── test_endpoints.js     # Automated end-to-end API test verification suite
│   ├── curl_examples.sh      # Ready-to-use cURL commands for each endpoint
│   └── api_requests.http     # VS Code REST Client test collection
└── README.md                 # Complete API documentation & integration guide
```

---

## 🚀 Quick Start & How to Run Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongod`) running on port `27017`, or a MongoDB Atlas URI.

### 1. Installation
Navigate to this module folder and install dependencies:
```bash
cd catalog-inventory-module
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` (a ready `.env` is already configured for local dev):
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/groceryDB
CORS_ORIGIN=*
```

### 3. Seed Database (20 Products + Initial Workers)
Populate the database with realistic Dairy and Basic Grocery items, including pre-configured low-stock items for immediate testing:
```bash
npm run seed
```

### 4. Start the Server
- **Production / Standard Mode**:
  ```bash
  npm start
  ```
- **Development Mode (Auto-reload with nodemon)**:
  ```bash
  npm run dev
  ```
The server will run on `http://localhost:5001`.

### 5. Run Automated Endpoint Verification Tests
With the server running, execute the verification suite:
```bash
npm test
```

---

## 🤝 Integration Contracts for Teammate Modules

### 1. Smart Store Navigation Module
The navigation module calculates in-store walking paths and highlights shelf positions.
- **Contract**: Every product document contains a non-null `location` object:
  ```json
  "location": {
    "aisle": "D1",
    "shelf": "2"
  }
  ```
- **Fast Lookup**: Query products by barcode/SKU (`GET /api/products/:sku`) or ObjectId (`GET /api/products/:id`) to retrieve aisle coordinates immediately.
- **Location Update Endpoint**: Use `PATCH /api/products/:id/location` to dynamically reassign items to shelves.

### 2. Billing & Invoice Module
The billing module scans barcodes at checkout and deducts sold quantities.
- **Contract**: Products reliably expose `price` (Number), `stockQuantity` (Integer), `sku` (String), and `isOutOfStock` (Boolean).
- **Fast Cart Check**: Use `GET /api/inventory/status/:sku` to verify item availability in one call.
- **Atomic Stock Deduction**: Call `PATCH /api/inventory/:id/stock` with `action: "decrement"` and `amount: <qty>`.
  - **Overdraft Guard**: If `amount > stockQuantity`, the endpoint rejects the call with **HTTP 400 Bad Request** (`Insufficient stock`) and prevents negative inventory.

---

## 📡 Complete REST API Reference

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Verify server status and timestamp |

---

### Product Catalog APIs (`/api/products`)

#### 1. List Products
- **Endpoint**: `GET /api/products`
- **Query Parameters**:
  - `category` (optional): Filter by category (e.g., `Dairy`, `Basic Grocery`)
  - `aisle` (optional): Filter by aisle (e.g., `D1`, `G2`)
  - `lowStock` (optional): `true` to list items where stock <= threshold
  - `sortBy` (optional): `price_asc`, `price_desc`, `name_asc`, `stock_asc`
  - `page` / `limit`: Pagination controls (defaults: page=1, limit=50)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 20,
    "total": 20,
    "currentPage": 1,
    "totalPages": 1,
    "data": [
      {
        "_id": "6724a1b2c3d4e5f6a7b8c9d0",
        "name": "Amul Taaza Homogenised Toned Milk",
        "category": "Dairy",
        "price": 54.00,
        "unit": "litre",
        "description": "Pasteurised toned milk with 3.0% fat and 8.5% SNF.",
        "imageUrl": "https://...",
        "sku": "SKU-DAIRY-001",
        "location": { "aisle": "D1", "shelf": "1" },
        "stockQuantity": 45,
        "lowStockThreshold": 10,
        "isLowStock": false,
        "isOutOfStock": false,
        "createdAt": "2026-09-20T03:00:00.000Z",
        "updatedAt": "2026-09-20T03:00:00.000Z"
      }
    ]
  }
  ```

#### 2. Search Products
- **Endpoint**: `GET /api/products/search?q=:searchTerm`
- **Description**: Case-insensitive partial matching across `name`, `category`, `sku`, and `description`.
- **Example**: `GET /api/products/search?q=milk`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "query": "milk",
    "count": 3,
    "data": [ ... ]
  }
  ```

#### 3. Get Single Product
- **Endpoint**: `GET /api/products/:id` (accepts MongoDB `_id` OR `sku`)
- **Example**: `GET /api/products/SKU-DAIRY-001` or `GET /api/products/6724a1...`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "6724a1b2c3d4e5f6a7b8c9d0",
      "name": "Amul Taaza Homogenised Toned Milk",
      "category": "Dairy",
      "price": 54.00,
      "unit": "litre",
      "sku": "SKU-DAIRY-001",
      "location": { "aisle": "D1", "shelf": "1" },
      "stockQuantity": 45,
      "lowStockThreshold": 10,
      "isLowStock": false
    }
  }
  ```

#### 4. Create Product
- **Endpoint**: `POST /api/products`
- **Request Body**:
  ```json
  {
    "name": "Organic Almond Milk 1L",
    "category": "Dairy",
    "price": 180.00,
    "unit": "litre",
    "description": "Cold-pressed unsweetened almond milk",
    "sku": "SKU-DAIRY-011",
    "location": {
      "aisle": "D2",
      "shelf": "1"
    },
    "stockQuantity": 25,
    "lowStockThreshold": 5
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": { ... }
  }
  ```

#### 5. Update Product Details
- **Endpoint**: `PUT /api/products/:id`
- **Request Body**: Any editable fields (`name`, `price`, `description`, etc.)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product updated successfully",
    "data": { ... }
  }
  ```

#### 6. Update Shelf/Aisle Location
- **Endpoint**: `PATCH /api/products/:id/location`
- **Request Body**:
  ```json
  {
    "aisle": "D3",
    "shelf": "2"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product shelf/aisle location updated successfully",
    "data": {
      "id": "6724a1...",
      "name": "Organic Almond Milk 1L",
      "sku": "SKU-DAIRY-011",
      "location": { "aisle": "D3", "shelf": "2" }
    }
  }
  ```

#### 7. Delete Product
- **Endpoint**: `DELETE /api/products/:id`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Product 'Organic Almond Milk 1L' deleted successfully",
    "data": { "id": "6724a1..." }
  }
  ```

---

### Inventory Management APIs (`/api/inventory`)

#### 1. Update Stock Quantity (Restock / Sale / Set)
- **Endpoint**: `PATCH /api/inventory/:id/stock` (accepts MongoDB `_id` OR `sku`)
- **Restock Example (Increment)**:
  ```json
  {
    "action": "increment",
    "amount": 20
  }
  ```
- **Checkout Sale Example (Decrement)**:
  ```json
  {
    "action": "decrement",
    "amount": 2
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Stock updated successfully via decrement",
    "data": {
      "id": "6724a1...",
      "name": "Amul Taaza Homogenised Toned Milk",
      "sku": "SKU-DAIRY-001",
      "previousStock": 45,
      "currentStock": 43,
      "lowStockThreshold": 10,
      "isLowStock": false,
      "isOutOfStock": false,
      "actionTaken": "decrement",
      "amountChanged": 2
    }
  }
  ```
- **Insufficient Stock Error (400 Bad Request)**:
  ```json
  {
    "success": false,
    "error": "Insufficient stock for 'Amul Taaza Homogenised Toned Milk'. Available: 3, Requested deduction: 10",
    "availableStock": 3,
    "requestedAmount": 10
  }
  ```

#### 2. List Low-Stock Products
- **Endpoint**: `GET /api/inventory/low-stock`
- **Query Parameters**: `category` (optional)
- **Description**: Returns all catalog items where `stockQuantity <= lowStockThreshold`.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 4,
    "timestamp": "2026-09-20T03:45:00.000Z",
    "data": [
      {
        "_id": "...",
        "name": "Amul Pure Cow Ghee",
        "category": "Dairy",
        "stockQuantity": 2,
        "lowStockThreshold": 5,
        "isLowStock": true,
        "location": { "aisle": "D1", "shelf": "4" }
      }
    ]
  }
  ```

#### 3. Quick Inventory Status
- **Endpoint**: `GET /api/inventory/status/:id` (accepts MongoDB `_id` OR `sku`)
- **Description**: Rapid availability check for checkout carts and pathfinding apps.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "sku": "SKU-DAIRY-001",
      "name": "Amul Taaza Homogenised Toned Milk",
      "price": 54,
      "unit": "litre",
      "stockQuantity": 43,
      "lowStockThreshold": 10,
      "inStock": true,
      "isLowStock": false,
      "location": { "aisle": "D1", "shelf": "1" }
    }
  }
  ```

---

### Worker Management APIs (`/api/workers`)

#### 1. List Workers
- **Endpoint**: `GET /api/workers`
- **Query Parameters**: `role`, `aisle`, `isActive`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 4,
    "data": [
      {
        "_id": "...",
        "name": "Ramesh Kumar",
        "role": "Shelf Stocker",
        "contact": {
          "phone": "9876543211",
          "email": "ramesh.kumar@smartgrocery.com"
        },
        "assignedSection": {
          "aisle": "D1",
          "section": "Dairy & Cold Storage"
        },
        "isActive": true
      }
    ]
  }
  ```

#### 2. Register Worker
- **Endpoint**: `POST /api/workers`
- **Request Body**:
  ```json
  {
    "name": "Sunita Reddy",
    "role": "Cashier",
    "contact": {
      "phone": "9876543214",
      "email": "sunita.reddy@smartgrocery.com"
    },
    "assignedSection": {
      "aisle": "CHECKOUT",
      "section": "Self-Billing & Express Counters"
    }
  }
  ```
- **Response (201 Created)**

#### 3. Update Worker
- **Endpoint**: `PUT /api/workers/:id`

#### 4. Delete Worker
- **Endpoint**: `DELETE /api/workers/:id`

---

## 🛡️ Error Handling Standards

All responses adhere to standardized JSON formats:
- **Success Format**:
  ```json
  {
    "success": true,
    "message": "Optional message",
    "data": { ... }
  }
  ```
- **Failure Format**:
  ```json
  {
    "success": false,
    "error": "Error description",
    "errors": [ ... ]
  }
  ```

| HTTP Status Code | Meaning | Example Trigger |
|---|---|---|
| `200 OK` | Request succeeded | Fetching products, successful update |
| `201 Created` | Resource created | Created new product or registered worker |
| `400 Bad Request` | Input validation failed or invalid ID format | Missing mandatory fields, illegal unit, insufficient stock on decrement |
| `404 Not Found` | Resource or route not found | Querying non-existent product ID or SKU |
| `409 Conflict` | Duplicate unique key | Attempting to create product with existing SKU |
| `500 Internal Error` | Unexpected server exception | Database connectivity issues |
