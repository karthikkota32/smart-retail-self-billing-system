#!/usr/bin/env bash
# ==============================================================================
# cURL Examples for Product Catalog & Inventory Module
# Base URL: http://localhost:5001
# ==============================================================================

BASE_URL="http://localhost:5001"

echo "=== 1. HEALTH CHECK ==="
curl -X GET "$BASE_URL/health"
echo -e "\n"

echo "=== 2. GET ALL PRODUCTS ==="
curl -X GET "$BASE_URL/api/products"
echo -e "\n"

echo "=== 3. FILTER PRODUCTS BY CATEGORY (Dairy) ==="
curl -X GET "$BASE_URL/api/products?category=Dairy"
echo -e "\n"

echo "=== 4. SEARCH PRODUCTS (Partial match 'milk') ==="
curl -X GET "$BASE_URL/api/products/search?q=milk"
echo -e "\n"

echo "=== 5. CREATE A NEW PRODUCT ==="
curl -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Country Delight Cow Milk 500ml",
    "category": "Dairy",
    "price": 38.00,
    "unit": "litre",
    "description": "Natural pure cow milk packet",
    "sku": "SKU-DAIRY-999",
    "location": {
      "aisle": "D1",
      "shelf": "2"
    },
    "stockQuantity": 25,
    "lowStockThreshold": 5
  }'
echo -e "\n"

echo "=== 6. GET PRODUCT BY SKU ==="
curl -X GET "$BASE_URL/api/products/SKU-DAIRY-999"
echo -e "\n"

echo "=== 7. UPDATE PRODUCT SHELF/AISLE LOCATION (Smart Store Navigation) ==="
# Replace :id with the product ObjectId or SKU
curl -X PATCH "$BASE_URL/api/products/SKU-DAIRY-999/location" \
  -H "Content-Type: application/json" \
  -d '{
    "aisle": "D3",
    "shelf": "4"
  }'
echo -e "\n"

echo "=== 8. RESTOCK INVENTORY (Increment stock by 10) ==="
curl -X PATCH "$BASE_URL/api/inventory/SKU-DAIRY-999/stock" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "increment",
    "amount": 10
  }'
echo -e "\n"

echo "=== 9. BILLING DEDUCTION (Decrement stock by 5 during sale) ==="
curl -X PATCH "$BASE_URL/api/inventory/SKU-DAIRY-999/stock" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "decrement",
    "amount": 5
  }'
echo -e "\n"

echo "=== 10. LIST LOW-STOCK PRODUCTS (Admin Dashboard) ==="
curl -X GET "$BASE_URL/api/inventory/low-stock"
echo -e "\n"

echo "=== 11. CHECK INVENTORY & PRICE STATUS (Billing Cart Check) ==="
curl -X GET "$BASE_URL/api/inventory/status/SKU-DAIRY-999"
echo -e "\n"

echo "=== 12. REGISTER A STORE WORKER ==="
curl -X POST "$BASE_URL/api/workers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Verma",
    "role": "Shelf Stocker",
    "contact": {
      "phone": "9876543299",
      "email": "rahul.verma@smartgrocery.com"
    },
    "assignedSection": {
      "aisle": "D1",
      "section": "Dairy Cold Room"
    }
  }'
echo -e "\n"

echo "=== 13. LIST ALL WORKERS ==="
curl -X GET "$BASE_URL/api/workers"
echo -e "\n"

echo "=== 14. DELETE A PRODUCT ==="
# Replace with actual product _id
# curl -X DELETE "$BASE_URL/api/products/<PRODUCT_ID>"
