import os
import sqlite3
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from datetime import datetime, timezone, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash
from bson.objectid import ObjectId
from mongo_config import MongoDBCollections

load_dotenv()

app = Flask(__name__)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
CORS(app, resources={r"/*": {"origins": [o.strip() for o in allowed_origins]}})

DB_PATH = Path(__file__).with_name("app.db")

# Email configuration
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def _is_valid_phone(phone):
    return phone.isdigit() and len(phone) == 10


def _format_datetime(dt):
    """Helper function to safely format datetime objects to ISO format"""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, str):
        return dt
    return None


def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _get_db()
    
    # Users table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL
        )
        """
    )
    
    # Products table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            location TEXT,
            category TEXT,
            image TEXT,
            backImage TEXT,
            description TEXT,
            stock INTEGER DEFAULT 999,
            barcode TEXT,
            reviews TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        )
        """
    )
    
    # Orders table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            payment_mode TEXT DEFAULT 'Unknown',
            status TEXT DEFAULT 'confirmed',
            created_at TEXT NOT NULL
        )
        """
    )
    
    # Wishlist table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(phone, product_id)
        )
        """
    )
    
    # Coupons table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            discount_percent REAL NOT NULL,
            max_discount REAL,
            min_purchase REAL DEFAULT 0,
            expiry_date TEXT,
            usage_limit INTEGER,
            used_count INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )
    
    # Reviews table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            rating INTEGER NOT NULL,
            text TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
        """
    )
    
    conn.commit()
    conn.close()

def _send_email(to_email, subject, body):
    """Send email notification. Returns True if successful, False otherwise."""
    if not to_email or not EMAIL_SENDER or not EMAIL_PASSWORD:
        return False
    
    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_SENDER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


def _send_login_email(email, username):
    """Send login notification email"""
    subject = "Login Successful - Smart Retail"
    body = f"""
    <h2>Welcome back, {username}!</h2>
    <p>Your login was successful at Smart Retail Store.</p>
    <p>If this wasn't you, please change your password immediately.</p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
        This is an automated email. Please do not reply.
    </p>
    """
    return _send_email(email, subject, body)


def _send_order_email(email, order_id, items, total, date):
    """Send order confirmation email"""
    items_html = "".join([
        f"<tr><td>{item['name']}</td><td>₹{item['price']}</td><td>{item['quantity']}</td><td>₹{item['price'] * item['quantity']}</td></tr>"
        for item in items
    ])
    
    subject = f"Order Confirmation - Order #{order_id}"
    body = f"""
    <h2>Order Confirmation</h2>
    <p>Thank you for your purchase!</p>
    <p><strong>Order ID:</strong> #{order_id}</p>
    <p><strong>Order Date:</strong> {date}</p>
    
    <h3>Order Details:</h3>
    <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
        <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
        </tr>
        {items_html}
    </table>
    
    <h3 style="text-align: right;">Total: ₹{total}</h3>
    
    <p>Thank you for shopping with Smart Retail!</p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
        This is an automated email. Please do not reply.
    </p>
    """
    return _send_email(email, subject, body)

@app.get("/health")
def health_check():
    return jsonify({"status": "ok"})


@app.get("/")
def home():
    return "Backend is running"


@app.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    name = str(payload.get("name", "")).strip()
    phone = str(payload.get("phone", "")).strip()
    email = str(payload.get("email", "")).strip() if payload.get("email") else None
    password = str(payload.get("password", ""))

    if not username or not name or not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Enter username, name, and valid 10-digit phone"}), 400
    if len(password) < 6:
        return jsonify({"ok": False, "message": "Password must be at least 6 characters"}), 400

    role = "admin" if username.lower() == "admin" else "user"
    password_hash = generate_password_hash(password)

    try:
        conn = _get_db()
        conn.execute(
            "INSERT INTO users (username, name, phone, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (username, name, phone, email or None, password_hash, role),
        )
        conn.commit()
    except sqlite3.IntegrityError as e:
        if "username" in str(e):
            return jsonify({"ok": False, "message": "Username already taken"}), 409
        return jsonify({"ok": False, "message": "Phone already registered"}), 409
    finally:
        conn.close()

    return jsonify({"ok": True, "username": username, "name": name, "phone": phone, "email": email, "role": role})



@app.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not username or not password:
        return jsonify({"ok": False, "message": "Enter username and password"}), 400

    conn = _get_db()
    user = conn.execute("SELECT id, username, name, phone, email, password_hash, role FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "message": "Invalid credentials"}), 401

    # Send login notification email if email exists
    if user["email"]:
        _send_login_email(user["email"], username)

    return jsonify({
        "ok": True,
        "username": user["username"],
        "name": user["name"],
        "phone": user["phone"],
        "email": user["email"],
        "role": user["role"]
    })


@app.get("/products")
def get_products():
    """Fetch all products from MongoDB (without _id), with SQLite fallback."""
    try:
        products_col = MongoDBCollections.get_collection("products")
        products = list(products_col.find({}, {"_id": 0}))
        return jsonify(products)
    except Exception:
        conn = _get_db()
        products = conn.execute("SELECT * FROM products ORDER BY created_at DESC").fetchall()
        conn.close()

        result = []
        for p in products:
            result.append({
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "location": p["location"],
                "category": p["category"],
                "image": p["image"],
                "backImage": p["backImage"],
                "description": p["description"],
                "stock": p["stock"],
                "reviews": json.loads(p["reviews"]) if p["reviews"] else [],
                "createdAt": p["created_at"],
            })

        return jsonify(result)


@app.get("/products/search")
def search_products():
    """Search and filter products by name, category, and price range"""
    query = str(request.args.get("q", "")).strip().lower()
    category = str(request.args.get("category", "")).strip()
    min_price = request.args.get("minPrice")
    max_price = request.args.get("maxPrice")
    sort_by = str(request.args.get("sortBy", "created_at")).strip()
    
    # Build SQL query
    sql = "SELECT * FROM products WHERE 1=1"
    params = []
    
    # Search by name or description
    if query:
        sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)"
        params.extend([f"%{query}%", f"%{query}%"])
    
    # Filter by category
    if category:
        sql += " AND LOWER(category) = ?"
        params.append(category.lower())
    
    # Filter by price range
    if min_price:
        sql += " AND price >= ?"
        params.append(float(min_price))
    
    if max_price:
        sql += " AND price <= ?"
        params.append(float(max_price))
    
    # Sort
    if sort_by == "price_asc":
        sql += " ORDER BY price ASC"
    elif sort_by == "price_desc":
        sql += " ORDER BY price DESC"
    elif sort_by == "name":
        sql += " ORDER BY name ASC"
    else:
        sql += " ORDER BY created_at DESC"
    
    conn = _get_db()
    products = conn.execute(sql, params).fetchall()
    conn.close()
    
    result = []
    for p in products:
        result.append({
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "location": p["location"],
            "category": p["category"],
            "image": p["image"],
            "backImage": p["backImage"],
            "description": p["description"],
            "stock": p["stock"],
            "reviews": json.loads(p["reviews"]) if p["reviews"] else [],
            "createdAt": p["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "query": query,
        "resultCount": len(result),
        "products": result
    })


@app.get("/products/category/<category>")
def get_products_by_category(category):
    """Get all products in a specific category"""
    conn = _get_db()
    products = conn.execute(
        "SELECT * FROM products WHERE LOWER(category) = ? ORDER BY created_at DESC",
        (category.lower(),)
    ).fetchall()
    conn.close()
    
    result = []
    for p in products:
        result.append({
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "location": p["location"],
            "category": p["category"],
            "image": p["image"],
            "backImage": p["backImage"],
            "description": p["description"],
            "stock": p["stock"],
            "reviews": json.loads(p["reviews"]) if p["reviews"] else [],
            "createdAt": p["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "category": category,
        "products": result
    })


@app.get("/categories")
def get_categories():
    """Get all unique product categories"""
    conn = _get_db()
    categories = conn.execute(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category ASC"
    ).fetchall()
    conn.close()
    
    result = [cat["category"] for cat in categories]
    
    return jsonify({
        "ok": True,
        "categories": result
    })



@app.get("/products/seed")
def seed_products():
    """Seed database with sample products (development only)"""
    conn = _get_db()
    
    # Check if products already exist
    existing = conn.execute("SELECT COUNT(*) FROM products").fetchone()
    if existing[0] > 0:
        conn.close()
        return jsonify({"ok": False, "message": "Products already exist"}), 400
    
    sample_products = [
        {
            "id": 1001,
            "name": "Rice (Basmati)",
            "price": 250,
            "location": "A1",
            "category": "Grains",
            "image": "🌾",
            "backImage": "🌾",
            "description": "Premium basmati rice, 1kg pack",
            "stock": 50,
            "barcode": "8901000100056",
        },
        {
            "id": 1002,
            "name": "Wheat Flour",
            "price": 80,
            "location": "A2",
            "category": "Grains",
            "image": "🌾",
            "backImage": "🌾",
            "description": "Pure wheat flour for chapati",
            "stock": 60,
            "barcode": "8901000100063",
        },
        {
            "id": 1003,
            "name": "Sunflower Oil",
            "price": 320,
            "location": "B1",
            "category": "Oils",
            "image": "🌻",
            "backImage": "🌻",
            "description": "Refined sunflower oil, 1L",
            "stock": 40,
            "barcode": "8901000100070",
        },
        {
            "id": 1004,
            "name": "Coconut Oil",
            "price": 350,
            "location": "B2",
            "category": "Oils",
            "image": "🥥",
            "backImage": "🥥",
            "description": "Pure coconut oil for cooking",
            "stock": 35,
            "barcode": "8901000100087",
        },
        {
            "id": 1005,
            "name": "Milk (1L)",
            "price": 60,
            "location": "C1",
            "category": "Dairy",
            "image": "🥛",
            "backImage": "🥛",
            "description": "Fresh whole milk daily",
            "stock": 100,
            "barcode": "8901000100094",
        },
        {
            "id": 1006,
            "name": "Butter",
            "price": 450,
            "location": "C2",
            "category": "Dairy",
            "image": "🧈",
            "backImage": "🧈",
            "description": "Premium butter, 500g",
            "stock": 30,
            "barcode": "8901000100100",
        },
        {
            "id": 1007,
            "name": "Tomatoes",
            "price": 40,
            "location": "D1",
            "category": "Vegetables",
            "image": "🍅",
            "backImage": "🍅",
            "description": "Fresh red tomatoes, 1kg",
            "stock": 80,
            "barcode": "8901000100117",
        },
        {
            "id": 1008,
            "name": "Onions",
            "price": 35,
            "location": "D2",
            "category": "Vegetables",
            "image": "🧅",
            "backImage": "🧅",
            "description": "Fresh onions, 1kg",
            "stock": 90,
            "barcode": "8901000100124",
        },
        {
            "id": 1009,
            "name": "Carrots",
            "price": 50,
            "location": "D3",
            "category": "Vegetables",
            "image": "🥕",
            "backImage": "🥕",
            "description": "Fresh orange carrots, 1kg",
            "stock": 70,
            "barcode": "8901000100131",
        },
        {
            "id": 1010,
            "name": "Apples",
            "price": 120,
            "location": "E1",
            "category": "Fruits",
            "image": "🍎",
            "backImage": "🍎",
            "description": "Fresh red apples, 1kg",
            "stock": 50,
            "barcode": "8901000100148",
        },
    ]
    
    for p in sample_products:
        conn.execute(
            """INSERT INTO products (id, name, price, location, category, image, backImage, description, stock, barcode, reviews, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
            (p["id"], p["name"], p["price"], p["location"], p["category"], p["image"], p["backImage"], 
             p["description"], p["stock"], p["barcode"], json.dumps([]))
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": f"Seeded {len(sample_products)} products"}), 201


@app.get("/products/<int:product_id>")
def get_product(product_id):
    """Fetch single product by ID"""
    conn = _get_db()
    product = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    conn.close()
    
    if not product:
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    return jsonify({
        "ok": True,
        "product": {
            "id": product["id"],
            "name": product["name"],
            "price": product["price"],
            "location": product["location"],
            "category": product["category"],
            "image": product["image"],
            "backImage": product["backImage"],
            "description": product["description"],
            "stock": product["stock"],
            "barcode": product["barcode"],
            "reviews": json.loads(product["reviews"]) if product["reviews"] else [],
            "createdAt": product["created_at"],
        }
    })


# ============= PRODUCT COMPARISON =============

@app.post("/products/compare")
def compare_products():
    """Compare multiple products"""
    payload = request.get_json(silent=True) or {}
    product_ids = payload.get("productIds", [])
    
    if not product_ids or len(product_ids) < 2:
        return jsonify({"ok": False, "message": "At least 2 products required for comparison"}), 400
    
    if len(product_ids) > 5:
        return jsonify({"ok": False, "message": "Cannot compare more than 5 products"}), 400
    
    conn = _get_db()
    
    products = []
    for pid in product_ids:
        product = conn.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone()
        if product:
            products.append({
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "location": product["location"],
                "category": product["category"],
                "image": product["image"],
                "backImage": product["backImage"],
                "description": product["description"],
                "stock": product["stock"],
                "barcode": product["barcode"],
            })
    
    conn.close()
    
    if not products:
        return jsonify({"ok": False, "message": "No valid products found"}), 404
    
    # Build comparison table (feature by feature)
    comparison = {
        "name": [p["name"] for p in products],
        "price": [p["price"] for p in products],
        "category": [p["category"] for p in products],
        "location": [p["location"] for p in products],
        "stock": [p["stock"] for p in products],
        "barcode": [p["barcode"] for p in products],
    }
    
    return jsonify({
        "ok": True,
        "products": products,
        "comparison": comparison,
        "cheapest": min(products, key=lambda p: p["price"]),
        "mostExpensive": max(products, key=lambda p: p["price"]),
    })


@app.post("/products/compare/advanced")
def compare_products_advanced():
    """Compare products with ratings and reviews"""
    payload = request.get_json(silent=True) or {}
    product_ids = payload.get("productIds", [])
    
    if not product_ids or len(product_ids) < 2:
        return jsonify({"ok": False, "message": "At least 2 products required for comparison"}), 400
    
    if len(product_ids) > 5:
        return jsonify({"ok": False, "message": "Cannot compare more than 5 products"}), 400
    
    conn = _get_db()
    
    comparison_data = []
    for pid in product_ids:
        product = conn.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone()
        
        if product:
            # Get rating info
            rating_info = conn.execute(
                """SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
                   FROM reviews WHERE product_id = ?""",
                (pid,)
            ).fetchone()
            
            avg_rating = round(rating_info["avg_rating"], 2) if rating_info["avg_rating"] else 0
            total_reviews = rating_info["total_reviews"] or 0
            
            comparison_data.append({
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "category": product["category"],
                "location": product["location"],
                "stock": product["stock"],
                "averageRating": avg_rating,
                "totalReviews": total_reviews,
                "description": product["description"],
            })
    
    conn.close()
    
    if not comparison_data:
        return jsonify({"ok": False, "message": "No valid products found"}), 404
    
    return jsonify({
        "ok": True,
        "products": comparison_data,
        "highestRated": max(comparison_data, key=lambda p: p["averageRating"]),
        "cheapest": min(comparison_data, key=lambda p: p["price"]),
    })



@app.post("/orders")
def create_order():
    """Create and save a new order"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    items = payload.get("items", [])
    total = float(payload.get("total", 0))
    payment_mode = str(payload.get("paymentMode", "Online")).strip()
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    if not items or len(items) == 0:
        return jsonify({"ok": False, "message": "Order must contain items"}), 400
    if total <= 0:
        return jsonify({"ok": False, "message": "Invalid total amount"}), 400
    
    conn = _get_db()
    products_col = MongoDBCollections.get_collection("products")

    def _product_id_candidates(raw_product_id):
        """Build possible id representations used across SQLite/Mongo documents."""
        candidates = []
        if raw_product_id is None:
            return candidates

        candidates.append(raw_product_id)

        if isinstance(raw_product_id, str):
            trimmed = raw_product_id.strip()
            if trimmed and trimmed not in candidates:
                candidates.append(trimmed)
            if trimmed.isdigit():
                numeric = int(trimmed)
                if numeric not in candidates:
                    candidates.append(numeric)
            try:
                oid = ObjectId(trimmed)
                if oid not in candidates:
                    candidates.append(oid)
            except Exception:
                pass
        elif isinstance(raw_product_id, (int, float)):
            numeric = int(raw_product_id)
            if numeric not in candidates:
                candidates.append(numeric)
            as_str = str(numeric)
            if as_str not in candidates:
                candidates.append(as_str)

        return candidates
    
    # Enrich items with product details for email
    items_with_details = []
    for item in items:
        # Try to find product by id or product_id field
        product_id = item.get("product_id") or item.get("id")
        product = None
        for candidate in _product_id_candidates(product_id):
            if isinstance(candidate, int):
                product = conn.execute("SELECT id, name, price FROM products WHERE id = ?", (candidate,)).fetchone()
                if product:
                    break
        
        # Use price from database if found, otherwise use price from item (fallback)
        price = product["price"] if product else item.get("price", 0)
        
        items_with_details.append({
            "product_id": product_id,
            "name": product["name"] if product else item.get("name", "Product"),
            "price": float(price),
            "price_per_unit": float(item.get("price_per_unit", price)),
            "unit_type": str(item.get("unit_type", "unit") or "unit"),
            "is_loose_item": bool(item.get("is_loose_item", False)),
            "quantity": max(0.001, float(item.get("quantity", 1) or 1))
        })
    
    # Check stock availability in MongoDB before creating order
    for item in items_with_details:
        try:
            mongo_product = None
            for candidate in _product_id_candidates(item["product_id"]):
                if isinstance(candidate, ObjectId):
                    mongo_product = products_col.find_one({"_id": candidate})
                else:
                    mongo_product = products_col.find_one({"id": candidate})
                if mongo_product:
                    break
            if mongo_product:
                current_stock = float(mongo_product.get("stock_quantity", 0) or 0)
                if current_stock < item["quantity"]:
                    conn.close()
                    return jsonify({
                        "ok": False, 
                        "message": f"Insufficient stock for {item['name']}. Available: {current_stock}, Requested: {item['quantity']}"
                    }), 400
        except Exception as e:
            print(f"Warning: Could not check stock for product {item['product_id']}: {e}")
    
    # Create the order
    conn.execute(
        """INSERT INTO orders (phone, items, total, payment_mode, status, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))""",
        (phone, json.dumps(items_with_details), total, payment_mode, "confirmed")
    )
    conn.commit()
    
    # Deduct stock from MongoDB products
    for item in items_with_details:
        try:
            # Decrement stock quantity in MongoDB, handling multiple id formats.
            result = None
            for candidate in _product_id_candidates(item["product_id"]):
                query = {"_id": candidate} if isinstance(candidate, ObjectId) else {"id": candidate}
                result = products_col.update_one(
                    query,
                    {
                        "$inc": {"stock_quantity": -item["quantity"]},
                        "$set": {"updated_at": datetime.now()}
                    }
                )
                if result.modified_count > 0:
                    break
            if result and result.modified_count > 0:
                print(f"✓ Stock updated for product {item['product_id']}: -{item['quantity']}")
            
            # Also update SQLite for consistency
            sqlite_updated = False
            for candidate in _product_id_candidates(item["product_id"]):
                if isinstance(candidate, int):
                    update_result = conn.execute(
                        "UPDATE products SET stock = stock - ? WHERE id = ?",
                        (item["quantity"], candidate)
                    )
                    if update_result.rowcount > 0:
                        sqlite_updated = True
                        break
            if not sqlite_updated:
                print(f"Warning: SQLite stock update skipped for product {item['product_id']}")
            conn.commit()
        except Exception as e:
            print(f"Warning: Could not update stock for product {item['product_id']}: {e}")
    
    # Get the inserted order ID and date
    order_data = conn.execute("SELECT last_insert_rowid() as id, datetime('now') as date").fetchone()
    order_id = order_data["id"]
    order_date = order_data["date"]
    
    # Get user email to send order confirmation
    user = conn.execute("SELECT email FROM users WHERE phone = ?", (phone,)).fetchone()
    conn.close()
    
    # Send order confirmation email if email exists
    if user and user["email"]:
        _send_order_email(user["email"], order_id, items_with_details, total, order_date)
    
    return jsonify({
        "ok": True,
        "message": "Order created successfully",
        "orderId": order_id
    }), 201


@app.get("/orders/<phone>")
def get_orders(phone):
    """Fetch all orders for a user by phone number"""
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    orders = conn.execute(
        "SELECT id, phone, items, total, payment_mode, status, created_at FROM orders WHERE phone = ? ORDER BY created_at DESC",
        (phone,)
    ).fetchall()
    conn.close()
    
    result = []
    for order in orders:
        result.append({
            "id": order["id"],
            "phone": order["phone"],
            "items": json.loads(order["items"]) if order["items"] else [],
            "totalAmount": order["total"],
            "paymentMode": order["payment_mode"],
            "status": order["status"],
            "createdAt": order["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "orders": result
    })


# ============= WISHLIST ENDPOINTS =============

@app.get("/wishlist/<phone>")
def get_wishlist(phone):
    """Fetch user's wishlist"""
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    wishlist_items = conn.execute(
        """SELECT w.id, w.product_id, p.id, p.name, p.price, p.image, p.category 
           FROM wishlist w 
           JOIN products p ON w.product_id = p.id 
           WHERE w.phone = ? 
           ORDER BY w.created_at DESC""",
        (phone,)
    ).fetchall()
    conn.close()
    
    result = []
    for item in wishlist_items:
        result.append({
            "id": item["product_id"],
            "name": item["name"],
            "price": item["price"],
            "image": item["image"],
            "category": item["category"]
        })
    
    return jsonify({
        "ok": True,
        "wishlist": result
    })


@app.post("/wishlist")
def add_to_wishlist():
    """Add product to wishlist"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    product_id = payload.get("product_id")
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    if not product_id:
        return jsonify({"ok": False, "message": "Product ID required"}), 400
    
    conn = _get_db()
    
    # Check if product exists
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    try:
        conn.execute(
            "INSERT INTO wishlist (phone, product_id, created_at) VALUES (?, ?, datetime('now'))",
            (phone, product_id)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "message": "Product already in wishlist"}), 409
    finally:
        conn.close()
    
    return jsonify({"ok": True, "message": "Added to wishlist"}), 201


@app.delete("/wishlist/<phone>/<int:product_id>")
def remove_from_wishlist(phone, product_id):
    """Remove product from wishlist"""
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    conn.execute(
        "DELETE FROM wishlist WHERE phone = ? AND product_id = ?",
        (phone, product_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Removed from wishlist"})


# ============= COUPON ENDPOINTS =============

@app.get("/coupons")
def get_coupons():
    """List all active coupons"""
    conn = _get_db()
    coupons = conn.execute(
        """SELECT id, code, discount_percent, max_discount, min_purchase, expiry_date, usage_limit, used_count 
           FROM coupons 
           WHERE active = 1 
           AND (expiry_date IS NULL OR expiry_date > datetime('now'))
           AND (usage_limit IS NULL OR used_count < usage_limit)
           ORDER BY created_at DESC"""
    ).fetchall()
    conn.close()
    
    result = []
    for coupon in coupons:
        result.append({
            "id": coupon["id"],
            "code": coupon["code"],
            "discountPercent": coupon["discount_percent"],
            "maxDiscount": coupon["max_discount"],
            "minPurchase": coupon["min_purchase"],
            "expiryDate": coupon["expiry_date"],
            "usageLimit": coupon["usage_limit"],
            "usedCount": coupon["used_count"]
        })
    
    return jsonify({
        "ok": True,
        "coupons": result
    })


@app.post("/coupons/validate")
def validate_coupon():
    """Validate and apply coupon code"""
    payload = request.get_json(silent=True) or {}
    code = str(payload.get("code", "")).strip().upper()
    total = float(payload.get("total", 0))
    
    if not code:
        return jsonify({"ok": False, "message": "Coupon code required"}), 400
    if total <= 0:
        return jsonify({"ok": False, "message": "Invalid total amount"}), 400
    
    conn = _get_db()
    coupon = conn.execute(
        """SELECT id, code, discount_percent, max_discount, min_purchase, usage_limit, used_count 
           FROM coupons 
           WHERE code = ? AND active = 1 
           AND (expiry_date IS NULL OR expiry_date > datetime('now'))""",
        (code,)
    ).fetchone()
    conn.close()
    
    if not coupon:
        return jsonify({"ok": False, "message": "Invalid or expired coupon"}), 400
    
    if coupon["usage_limit"] and coupon["used_count"] >= coupon["usage_limit"]:
        return jsonify({"ok": False, "message": "Coupon usage limit reached"}), 400
    
    if coupon["min_purchase"] and total < coupon["min_purchase"]:
        return jsonify({
            "ok": False,
            "message": f"Minimum purchase of ₹{coupon['min_purchase']} required"
        }), 400
    
    discount = (total * coupon["discount_percent"]) / 100
    if coupon["max_discount"]:
        discount = min(discount, coupon["max_discount"])
    
    return jsonify({
        "ok": True,
        "couponCode": coupon["code"],
        "discountPercent": coupon["discount_percent"],
        "discountAmount": round(discount, 2),
        "finalTotal": round(total - discount, 2)
    })


@app.post("/admin/coupons")
def create_coupon():
    """Create new coupon (admin only)"""
    payload = request.get_json(silent=True) or {}
    code = str(payload.get("code", "")).strip().upper()
    discount_percent = float(payload.get("discountPercent", 0))
    max_discount = payload.get("maxDiscount")
    min_purchase = payload.get("minPurchase", 0)
    expiry_date = payload.get("expiryDate")
    usage_limit = payload.get("usageLimit")
    admin_username = payload.get("admin_username", "")
    
    # Basic admin check (in production, use proper authentication)
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    if not code or discount_percent <= 0 or discount_percent > 100:
        return jsonify({"ok": False, "message": "Invalid coupon details"}), 400
    
    conn = _get_db()
    
    try:
        conn.execute(
            """INSERT INTO coupons (code, discount_percent, max_discount, min_purchase, expiry_date, usage_limit, created_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
            (code, discount_percent, max_discount or None, min_purchase or None, expiry_date or None, usage_limit or None)
        )
        conn.commit()
        coupon_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "message": "Coupon code already exists"}), 409
    finally:
        conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Coupon created successfully",
        "couponId": coupon_id
    }), 201


@app.put("/admin/coupons/<int:coupon_id>")
def update_coupon(coupon_id):
    """Update coupon (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    coupon = conn.execute("SELECT id FROM coupons WHERE id = ?", (coupon_id,)).fetchone()
    
    if not coupon:
        conn.close()
        return jsonify({"ok": False, "message": "Coupon not found"}), 404
    
    updates = []
    params = []
    
    if "discountPercent" in payload:
        updates.append("discount_percent = ?")
        params.append(payload["discountPercent"])
    if "maxDiscount" in payload:
        updates.append("max_discount = ?")
        params.append(payload.get("maxDiscount"))
    if "minPurchase" in payload:
        updates.append("min_purchase = ?")
        params.append(payload.get("minPurchase"))
    if "expiryDate" in payload:
        updates.append("expiry_date = ?")
        params.append(payload.get("expiryDate"))
    if "usageLimit" in payload:
        updates.append("usage_limit = ?")
        params.append(payload.get("usageLimit"))
    if "active" in payload:
        updates.append("active = ?")
        params.append(1 if payload["active"] else 0)
    
    if not updates:
        conn.close()
        return jsonify({"ok": False, "message": "No updates provided"}), 400
    
    params.append(coupon_id)
    query = f"UPDATE coupons SET {', '.join(updates)} WHERE id = ?"
    
    conn.execute(query, params)
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Coupon updated successfully"})


@app.delete("/admin/coupons/<int:coupon_id>")
def delete_coupon(coupon_id):
    """Delete coupon (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    conn.execute("DELETE FROM coupons WHERE id = ?", (coupon_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Coupon deleted successfully"})


# ============= USER PROFILE ENDPOINTS =============

@app.get("/profile/<phone>")
def get_profile(phone):
    """Get user profile"""
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    user = conn.execute(
        "SELECT id, username, name, phone, email, role, created_at FROM users WHERE phone = ?",
        (phone,)
    ).fetchone()
    conn.close()
    
    if not user:
        return jsonify({"ok": False, "message": "User not found"}), 404
    
    return jsonify({
        "ok": True,
        "profile": {
            "username": user["username"],
            "name": user["name"],
            "phone": user["phone"],
            "email": user["email"],
            "role": user["role"],
            "createdAt": user["created_at"]
        }
    })


@app.put("/profile")
def update_profile():
    """Update user profile"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip() if payload.get("email") else None
    old_password = str(payload.get("oldPassword", ""))
    new_password = str(payload.get("newPassword", ""))
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    user = conn.execute(
        "SELECT id, password_hash FROM users WHERE phone = ?",
        (phone,)
    ).fetchone()
    
    if not user:
        conn.close()
        return jsonify({"ok": False, "message": "User not found"}), 404
    
    # If changing password, validate old password
    if new_password:
        if not old_password or not check_password_hash(user["password_hash"], old_password):
            conn.close()
            return jsonify({"ok": False, "message": "Invalid current password"}), 401
        
        if len(new_password) < 6:
            conn.close()
            return jsonify({"ok": False, "message": "New password must be at least 6 characters"}), 400
        
        new_password_hash = generate_password_hash(new_password)
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE phone = ?",
            (new_password_hash, phone)
        )
    
    # Update other fields
    if name:
        conn.execute("UPDATE users SET name = ? WHERE phone = ?", (name, phone))
    
    if email:
        conn.execute("UPDATE users SET email = ? WHERE phone = ?", (email, phone))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Profile updated successfully"
    })


# ============= PRODUCT REVIEWS ENDPOINTS =============

@app.get("/products/<int:product_id>/reviews")
def get_product_reviews(product_id):
    """Get all reviews for a product"""
    conn = _get_db()
    
    # Check if product exists
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    reviews = conn.execute(
        """SELECT id, product_id, phone, rating, text, created_at 
           FROM reviews 
           WHERE product_id = ? 
           ORDER BY created_at DESC""",
        (product_id,)
    ).fetchall()
    conn.close()
    
    result = []
    for review in reviews:
        result.append({
            "id": review["id"],
            "productId": review["product_id"],
            "phone": review["phone"],
            "rating": review["rating"],
            "text": review["text"],
            "createdAt": review["created_at"]
        })
    
    return jsonify({
        "ok": True,
        "reviews": result
    })


@app.get("/products/<int:product_id>/rating")
def get_product_rating(product_id):
    """Get average rating for a product"""
    conn = _get_db()
    
    # Check if product exists
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    rating_data = conn.execute(
        """SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
           FROM reviews 
           WHERE product_id = ?""",
        (product_id,)
    ).fetchone()
    conn.close()
    
    avg_rating = round(rating_data["avg_rating"], 2) if rating_data["avg_rating"] else 0
    total_reviews = rating_data["total_reviews"] or 0
    
    return jsonify({
        "ok": True,
        "productId": product_id,
        "averageRating": avg_rating,
        "totalReviews": total_reviews
    })


@app.post("/products/<int:product_id>/reviews")
def add_product_review(product_id):
    """Add a review for a product"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    rating = payload.get("rating")
    text = str(payload.get("text", "")).strip()
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    if not rating or rating < 1 or rating > 5:
        return jsonify({"ok": False, "message": "Rating must be between 1 and 5"}), 400
    
    conn = _get_db()
    
    # Check if product exists
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    # Check if user already reviewed this product
    existing_review = conn.execute(
        "SELECT id FROM reviews WHERE product_id = ? AND phone = ?",
        (product_id, phone)
    ).fetchone()
    
    if existing_review:
        conn.close()
        return jsonify({"ok": False, "message": "You have already reviewed this product"}), 409
    
    conn.execute(
        """INSERT INTO reviews (product_id, phone, rating, text, created_at) 
           VALUES (?, ?, ?, ?, datetime('now'))""",
        (product_id, phone, int(rating), text or None)
    )
    conn.commit()
    
    review_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Review added successfully",
        "reviewId": review_id
    }), 201


@app.put("/reviews/<int:review_id>")
def update_review(review_id):
    """Update a review"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    rating = payload.get("rating")
    text = str(payload.get("text", "")).strip()
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    
    # Check if review exists and belongs to the user
    review = conn.execute(
        "SELECT id, phone FROM reviews WHERE id = ?",
        (review_id,)
    ).fetchone()
    
    if not review:
        conn.close()
        return jsonify({"ok": False, "message": "Review not found"}), 404
    
    if review["phone"] != phone:
        conn.close()
        return jsonify({"ok": False, "message": "You can only edit your own reviews"}), 403
    
    updates = []
    params = []
    
    if rating is not None:
        if rating < 1 or rating > 5:
            conn.close()
            return jsonify({"ok": False, "message": "Rating must be between 1 and 5"}), 400
        updates.append("rating = ?")
        params.append(int(rating))
    
    if text:
        updates.append("text = ?")
        params.append(text)
    
    if not updates:
        conn.close()
        return jsonify({"ok": False, "message": "No updates provided"}), 400
    
    params.append(review_id)
    query = f"UPDATE reviews SET {', '.join(updates)} WHERE id = ?"
    
    conn.execute(query, params)
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Review updated successfully"})


@app.delete("/reviews/<int:review_id>")
def delete_review(review_id):
    """Delete a review"""
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    
    # Check if review exists and belongs to the user
    review = conn.execute(
        "SELECT id, phone FROM reviews WHERE id = ?",
        (review_id,)
    ).fetchone()
    
    if not review:
        conn.close()
        return jsonify({"ok": False, "message": "Review not found"}), 404
    
    if review["phone"] != phone:
        conn.close()
        return jsonify({"ok": False, "message": "You can only delete your own reviews"}), 403
    
    conn.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Review deleted successfully"})


# ============= ADMIN PRODUCT MANAGEMENT =============

@app.get("/admin/products")
def get_all_products_admin():
    """Get all products (admin view with full details)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    products = conn.execute("SELECT * FROM products ORDER BY created_at DESC").fetchall()
    conn.close()
    
    result = []
    for p in products:
        result.append({
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "location": p["location"],
            "category": p["category"],
            "image": p["image"],
            "backImage": p["backImage"],
            "description": p["description"],
            "stock": p["stock"],
            "barcode": p["barcode"],
            "reviews": json.loads(p["reviews"]) if p["reviews"] else [],
            "createdAt": p["created_at"],
        })
    
    return jsonify({"ok": True, "products": result})


@app.post("/admin/products")
def create_product():
    """Create new product (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    product_id = payload.get("id")
    name = str(payload.get("name", "")).strip()
    price = float(payload.get("price", 0))
    location = str(payload.get("location", "")).strip()
    category = str(payload.get("category", "")).strip()
    image = str(payload.get("image", "")).strip()
    back_image = str(payload.get("backImage", "")).strip()
    description = str(payload.get("description", "")).strip()
    stock = int(payload.get("stock", 999))
    barcode = str(payload.get("barcode", "")).strip()
    
    # Validate required fields
    if not product_id or not name or price <= 0:
        return jsonify({"ok": False, "message": "Product ID, name, and valid price required"}), 400
    
    conn = _get_db()
    
    try:
        conn.execute(
            """INSERT INTO products (id, name, price, location, category, image, backImage, description, stock, barcode, reviews, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
            (product_id, name, price, location or None, category or None, image or None, back_image or None, 
             description or None, stock, barcode or None, json.dumps([]))
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "message": "Product ID already exists"}), 409
    finally:
        conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Product created successfully",
        "productId": product_id
    }), 201


@app.put("/admin/products/<int:product_id>")
def update_product(product_id):
    """Update product details (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    updates = []
    params = []
    
    if "name" in payload:
        updates.append("name = ?")
        params.append(payload["name"])
    if "price" in payload:
        updates.append("price = ?")
        params.append(float(payload["price"]))
    if "location" in payload:
        updates.append("location = ?")
        params.append(payload.get("location"))
    if "category" in payload:
        updates.append("category = ?")
        params.append(payload.get("category"))
    if "image" in payload:
        updates.append("image = ?")
        params.append(payload.get("image"))
    if "backImage" in payload:
        updates.append("backImage = ?")
        params.append(payload.get("backImage"))
    if "description" in payload:
        updates.append("description = ?")
        params.append(payload.get("description"))
    if "stock" in payload:
        updates.append("stock = ?")
        params.append(int(payload["stock"]))
    if "barcode" in payload:
        updates.append("barcode = ?")
        params.append(payload.get("barcode"))
    
    if not updates:
        conn.close()
        return jsonify({"ok": False, "message": "No updates provided"}), 400
    
    params.append(product_id)
    query = f"UPDATE products SET {', '.join(updates)} WHERE id = ?"
    
    conn.execute(query, params)
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Product updated successfully"})


@app.delete("/admin/products/<int:product_id>")
def delete_product(product_id):
    """Delete product (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    product = conn.execute("SELECT id FROM products WHERE id = ?", (product_id,)).fetchone()
    
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True, "message": "Product deleted successfully"})


@app.put("/admin/products/<int:product_id>/stock")
def update_product_stock(product_id):
    """Update product stock level (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    stock = payload.get("stock")
    adjustment = payload.get("adjustment")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    if stock is None and adjustment is None:
        return jsonify({"ok": False, "message": "Either stock or adjustment required"}), 400
    
    conn = _get_db()
    product = conn.execute("SELECT id, stock FROM products WHERE id = ?", (product_id,)).fetchone()
    
    if not product:
        conn.close()
        return jsonify({"ok": False, "message": "Product not found"}), 404
    
    if stock is not None:
        new_stock = int(stock)
    else:
        new_stock = product["stock"] + int(adjustment)
    
    if new_stock < 0:
        conn.close()
        return jsonify({"ok": False, "message": "Stock cannot be negative"}), 400
    
    conn.execute("UPDATE products SET stock = ? WHERE id = ?", (new_stock, product_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Stock updated successfully",
        "productId": product_id,
        "newStock": new_stock
    })


# ============= ADMIN ORDER MANAGEMENT =============

@app.get("/admin/orders")
def get_all_orders():
    """Get all orders (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    orders = conn.execute(
        "SELECT id, phone, items, total, payment_mode, status, created_at FROM orders ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    
    result = []
    for order in orders:
        result.append({
            "id": order["id"],
            "phone": order["phone"],
            "items": json.loads(order["items"]) if order["items"] else [],
            "total": order["total"],
            "paymentMode": order["payment_mode"],
            "status": order["status"],
            "date": order["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "totalOrders": len(result),
        "orders": result
    })


@app.get("/admin/orders/<phone>")
def get_user_orders_admin(phone):
    """Get all orders for a specific user (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    if not _is_valid_phone(phone):
        return jsonify({"ok": False, "message": "Invalid phone number"}), 400
    
    conn = _get_db()
    orders = conn.execute(
        "SELECT id, phone, items, total, payment_mode, status, created_at FROM orders WHERE phone = ? ORDER BY created_at DESC",
        (phone,)
    ).fetchall()
    conn.close()
    
    result = []
    for order in orders:
        result.append({
            "id": order["id"],
            "phone": order["phone"],
            "items": json.loads(order["items"]) if order["items"] else [],
            "total": order["total"],
            "paymentMode": order["payment_mode"],
            "status": order["status"],
            "date": order["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "phone": phone,
        "orders": result
    })


@app.get("/admin/orders/status/<status>")
def get_orders_by_status(status):
    """Get all orders with specific status (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    valid_statuses = ["confirmed", "shipped", "delivered", "cancelled"]
    if status.lower() not in valid_statuses:
        return jsonify({
            "ok": False,
            "message": f"Invalid status. Valid options: {', '.join(valid_statuses)}"
        }), 400
    
    conn = _get_db()
    orders = conn.execute(
        "SELECT id, phone, items, total, payment_mode, status, created_at FROM orders WHERE LOWER(status) = ? ORDER BY created_at DESC",
        (status.lower(),)
    ).fetchall()
    conn.close()
    
    result = []
    for order in orders:
        result.append({
            "id": order["id"],
            "phone": order["phone"],
            "items": json.loads(order["items"]) if order["items"] else [],
            "total": order["total"],
            "paymentMode": order["payment_mode"],
            "status": order["status"],
            "date": order["created_at"],
        })
    
    return jsonify({
        "ok": True,
        "status": status,
        "count": len(result),
        "orders": result
    })


@app.put("/admin/orders/<int:order_id>/status")
def update_order_status(order_id):
    """Update order status (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    new_status = str(payload.get("status", "")).strip().lower()
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    valid_statuses = ["confirmed", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        return jsonify({
            "ok": False,
            "message": f"Invalid status. Valid options: {', '.join(valid_statuses)}"
        }), 400
    
    conn = _get_db()
    order = conn.execute("SELECT id, status FROM orders WHERE id = ?", (order_id,)).fetchone()
    
    if not order:
        conn.close()
        return jsonify({"ok": False, "message": "Order not found"}), 404
    
    conn.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        "ok": True,
        "message": "Order status updated successfully",
        "orderId": order_id,
        "newStatus": new_status
    })


@app.get("/admin/orders/stats")
def get_order_stats():
    """Get order statistics (admin only)"""
    payload = request.get_json(silent=True) or {}
    admin_username = payload.get("admin_username", "")
    
    if admin_username.lower() != "admin":
        return jsonify({"ok": False, "message": "Admin access required"}), 403
    
    conn = _get_db()
    
    total_orders = conn.execute("SELECT COUNT(*) as count FROM orders").fetchone()["count"]
    total_revenue = conn.execute("SELECT SUM(total) as sum FROM orders").fetchone()["sum"] or 0
    avg_order_value = conn.execute("SELECT AVG(total) as avg FROM orders").fetchone()["avg"] or 0
    
    status_counts = conn.execute(
        """SELECT status, COUNT(*) as count FROM orders GROUP BY status"""
    ).fetchall()
    
    conn.close()
    
    status_breakdown = {stat["status"]: stat["count"] for stat in status_counts}
    
    return jsonify({
        "ok": True,
        "stats": {
            "totalOrders": total_orders,
            "totalRevenue": round(total_revenue,2),
            "averageOrderValue": round(avg_order_value, 2),
            "statusBreakdown": status_breakdown
        }
    })


# ============= MONGODB PRODUCT ROUTES =============

@app.post("/api/mongo/products")
def create_product_mongo():
    """Create a new product in MongoDB"""
    try:
        products_col = MongoDBCollections.get_collection("products")
        data = request.json
        
        # Validate required fields
        if not data.get("name") or not data.get("price"):
            return jsonify({"success": False, "message": "Product name and price are required"}), 400
        
        product_doc = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "price": float(data.get("price")),
            "price_per_unit": float(data.get("price_per_unit", data.get("price", 0))),
            "unit_type": str(data.get("unit_type", "unit")).strip() or "unit",
            "is_loose_item": bool(data.get("is_loose_item", False)),
            "stock_quantity": float(data.get("stock_quantity", 0)),
            "category": data.get("category", ""),
            "image_url": data.get("image_url", ""),
            "barcode": data.get("barcode", ""),
            "location": data.get("location", ""),
            "rating": 0.0,
            "reviews_count": 0,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "is_active": True
        }
        
        result = products_col.insert_one(product_doc)
        
        return jsonify({
            "success": True,
            "message": "Product created successfully",
            "product_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/mongo/products/seed", methods=["GET", "POST"])
def seed_products_mongo():
    """Seed MongoDB products from backend/sample_data/products.json."""
    try:
        products_col = MongoDBCollections.get_collection("products")

        existing_count = products_col.count_documents({})
        force_seed = str(request.args.get("force", "0")).lower() in {"1", "true", "yes"}

        if existing_count > 0 and not force_seed:
            return jsonify({
                "success": False,
                "message": "Products already exist. Use ?force=1 to seed anyway.",
                "count": existing_count,
            }), 409

        sample_path = Path(__file__).with_name("sample_data") / "products.json"
        if not sample_path.exists():
            return jsonify({"success": False, "message": "Sample products file not found"}), 404

        with open(sample_path, "r", encoding="utf-8") as f:
            sample_products = json.load(f)

        prepared_products = []
        for p in sample_products:
            doc = {
                "name": p.get("name", "Unnamed Product"),
                "description": p.get("description", ""),
                "price": float(p.get("price", 0)),
                "price_per_unit": float(p.get("price_per_unit", p.get("price", 0))),
                "unit_type": str(p.get("unit_type", "unit")),
                "is_loose_item": bool(p.get("is_loose_item", False)),
                "stock_quantity": float(p.get("stock_quantity", 0)),
                "category": p.get("category", "General"),
                "image_url": p.get("image_url", ""),
                "barcode": p.get("barcode", ""),
                "location": p.get("location", ""),
                "rating": float(p.get("rating", 0.0)),
                "reviews_count": int(p.get("reviews_count", 0)),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_active": bool(p.get("is_active", True)),
            }
            prepared_products.append(doc)

        if force_seed:
            products_col.delete_many({})

        if prepared_products:
            products_col.insert_many(prepared_products)
            return jsonify({
                "success": True,
                "message": "Products seeded successfully"
            }), 201

        return jsonify({"success": False, "message": "No products to seed"}), 400

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/mongo/products")
def get_products_mongo():
    """Get all products from MongoDB"""
    try:
        products_col = MongoDBCollections.get_collection("products")
        
        products = list(products_col.find())
        
        # Convert ObjectId to string for JSON
        for product in products:
            product["_id"] = str(product["_id"])
            if "created_at" in product:
                product["created_at"] = product["created_at"].isoformat() if hasattr(product["created_at"], 'isoformat') else str(product["created_at"])
            if "updated_at" in product:
                product["updated_at"] = product["updated_at"].isoformat() if hasattr(product["updated_at"], 'isoformat') else str(product["updated_at"])
        
        return jsonify({
            "success": True,
            "count": len(products),
            "products": products
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/mongo/products/<product_id>")
def get_product_mongo(product_id):
    """Get a single product from MongoDB by ID"""
    try:
        products_col = MongoDBCollections.get_collection("products")
        
        product = products_col.find_one({"_id": ObjectId(product_id)})
        
        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404
        
        # Convert ObjectId to string
        product["_id"] = str(product["_id"])
        if "created_at" in product:
            product["created_at"] = product["created_at"].isoformat() if hasattr(product["created_at"], 'isoformat') else str(product["created_at"])
        if "updated_at" in product:
            product["updated_at"] = product["updated_at"].isoformat() if hasattr(product["updated_at"], 'isoformat') else str(product["updated_at"])
        
        return jsonify({
            "success": True,
            "product": product
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.put("/api/mongo/products/<product_id>")
def update_product_mongo(product_id):
    """Update a product in MongoDB"""
    try:
        products_col = MongoDBCollections.get_collection("products")
        data = request.json
        
        update_data = {
            "updated_at": datetime.now()
        }
        
        # Update only provided fields
        for field in ["name", "description", "price", "price_per_unit", "stock_quantity", "category", "image_url", "barcode", "location", "unit_type", "is_loose_item"]:
            if field in data:
                update_data[field] = data[field]
        
        result = products_col.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"success": False, "message": "Product not found"}), 404
        
        return jsonify({
            "success": True,
            "message": "Product updated successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.delete("/api/mongo/products/<product_id>")
def delete_product_mongo(product_id):
    """Delete a product from MongoDB"""
    try:
        products_col = MongoDBCollections.get_collection("products")
        
        result = products_col.delete_one({"_id": ObjectId(product_id)})
        
        if result.deleted_count == 0:
            return jsonify({"success": False, "message": "Product not found"}), 404
        
        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= USER MANAGEMENT ENDPOINTS (MongoDB) =============

@app.post("/api/users/register-mongo")
def register_user_mongo():
    """Register a new user in MongoDB"""
    try:
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        name = str(payload.get("name", "")).strip()
        phone = str(payload.get("phone", "")).strip()
        email = str(payload.get("email", "")).strip() if payload.get("email") else None
        password = str(payload.get("password", ""))
        
        if not username or not name or not _is_valid_phone(phone):
            return jsonify({"ok": False, "message": "Invalid input data"}), 400
        
        if len(password) < 6:
            return jsonify({"ok": False, "message": "Password must be at least 6 characters"}), 400
        
        users_col = MongoDBCollections.get_collection("users")
        
        # Check if user already exists
        existing = users_col.find_one({"phone": phone})
        if existing:
            return jsonify({"ok": False, "message": "Phone number already registered"}), 409
        
        existing = users_col.find_one({"username": username})
        if existing:
            return jsonify({"ok": False, "message": "Username already taken"}), 409
        
        # Create user document
        user_doc = {
            "username": username,
            "name": name,
            "phone": phone,
            "email": email,
            "password_hash": generate_password_hash(password),
            "is_admin": username.lower() == "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_login": None,
            "login_history": [],
            "orders": []
        }
        
        result = users_col.insert_one(user_doc)
        
        return jsonify({
            "ok": True,
            "user_id": str(result.inserted_id),
            "username": username,
            "name": name,
            "phone": phone,
            "email": email
        }), 201
    
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.post("/api/users/login-mongo")
def login_user_mongo():
    """Login user and track login history in MongoDB"""
    try:
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", ""))
        
        if not username or not password:
            return jsonify({"ok": False, "message": "Enter username and password"}), 400
        
        users_col = MongoDBCollections.get_collection("users")
        user = users_col.find_one({"username": username})
        
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            return jsonify({"ok": False, "message": "Invalid credentials"}), 401
        
        # Record login in history
        login_record = {
            "timestamp": datetime.now(timezone.utc),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "Unknown")
        }
        
        # Update user's last_login and add to login_history
        users_col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"last_login": datetime.now(timezone.utc)},
                "$push": {"login_history": login_record}
            }
        )
        
        return jsonify({
            "ok": True,
            "user_id": str(user["_id"]),
            "username": user["username"],
            "name": user["name"],
            "phone": user["phone"],
            "email": user["email"],
            "is_admin": user.get("is_admin", False)
        }), 200
    
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.post("/api/orders/mongo")
def create_order_mongo():
    """Create order and link to MongoDB user"""
    try:
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        items = payload.get("items", [])
        total = float(payload.get("total", 0))
        payment_method = str(payload.get("paymentMethod", "credit_card")).strip()
        
        if not username or not items or total <= 0:
            return jsonify({"ok": False, "message": "Invalid order data"}), 400
        
        users_col = MongoDBCollections.get_collection("users")
        orders_col = MongoDBCollections.get_collection("orders")
        products_col = MongoDBCollections.get_collection("products")
        
        # Find user
        user = users_col.find_one({"username": username})
        if not user:
            return jsonify({"ok": False, "message": "User not found"}), 404
        
        # Check stock availability before creating order
        for item in items:
            product_id = item.get("product_id") or item.get("id")
            quantity = float(item.get("quantity", 1) or 1)
            
            # Try to find product by MongoDB _id or integer id
            try:
                mongo_product = products_col.find_one({"_id": ObjectId(product_id)})
            except:
                mongo_product = products_col.find_one({"id": product_id})
            
            if mongo_product:
                current_stock = float(mongo_product.get("stock_quantity", 0) or 0)
                if current_stock < quantity:
                    return jsonify({
                        "ok": False,
                        "message": f"Insufficient stock for {item.get('name', 'product')}. Available: {current_stock}, Requested: {quantity}"
                    }), 400
        
        # Create order document
        order_doc = {
            "user_id": user["_id"],
            "username": username,
            "phone": user["phone"],
            "items": items,
            "total_amount": total,
            "payment_method": payment_method,
            "payment_status": "completed",
            "order_status": "pending",
            "created_at": datetime.now(timezone.utc),
            "shipping_address": payload.get("shipping_address", {})
        }
        
        result = orders_col.insert_one(order_doc)
        
        # Deduct stock from MongoDB products
        for item in items:
            product_id = item.get("product_id") or item.get("id")
            quantity = float(item.get("quantity", 1) or 1)
            
            try:
                # Try both _id and id fields
                try:
                    update_result = products_col.update_one(
                        {"_id": ObjectId(product_id)},
                        {
                            "$inc": {"stock_quantity": -quantity},
                            "$set": {"updated_at": datetime.now()}
                        }
                    )
                except:
                    update_result = products_col.update_one(
                        {"id": product_id},
                        {
                            "$inc": {"stock_quantity": -quantity},
                            "$set": {"updated_at": datetime.now()}
                        }
                    )
                
                if update_result.modified_count > 0:
                    print(f"✓ Stock updated for product {product_id}: -{quantity}")
            except Exception as e:
                print(f"Warning: Could not update stock for product {product_id}: {e}")
        
        # Add order reference to user
        users_col.update_one(
            {"_id": user["_id"]},
            {"$push": {"orders": {"order_id": str(result.inserted_id), "date": datetime.now(timezone.utc), "amount": total}}}
        )
        
        return jsonify({
            "ok": True,
            "order_id": str(result.inserted_id),
            "message": "Order created successfully"
        }), 201
    
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ============= ADMIN USER MANAGEMENT ENDPOINTS =============

@app.get("/api/admin/users")
def get_all_users():
    """Admin: Get all users with summary details"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        users = list(users_col.find({}))
        
        result = []
        for user in users:
            result.append({
                "id": str(user["_id"]),
                "username": user.get("username", ""),
                "name": user.get("name", ""),
                "phone": user.get("phone", ""),
                "email": user.get("email", ""),
                "is_admin": user.get("is_admin", False),
                "is_active": user.get("is_active", True),
                "created_at": _format_datetime(user.get("created_at")),
                "last_login": _format_datetime(user.get("last_login")),
                "total_orders": len(user.get("orders", [])),
                "total_spent": sum(order.get("amount", 0) for order in user.get("orders", []))
            })
        
        return jsonify({
            "success": True,
            "users": result,
            "total": len(result)
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/admin/users/<user_id>")
def get_user_details(user_id):
    """Admin: Get complete user details with login history and orders"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        orders_col = MongoDBCollections.get_collection("orders")
        
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Get user's orders
        orders = list(orders_col.find({"user_id": ObjectId(user_id)}))
        orders_data = []
        for order in orders:
            orders_data.append({
                "id": str(order["_id"]),
                "items": order.get("items", []),
                "total_amount": order.get("total_amount", 0),
                "payment_method": order.get("payment_method", ""),
                "payment_status": order.get("payment_status", ""),
                "order_status": order.get("order_status", ""),
                "created_at": _format_datetime(order.get("created_at")),
                "shipping_address": order.get("shipping_address", {})
            })
        
        # Format login history
        login_history = []
        for login in user.get("login_history", []):
            login_history.append({
                "timestamp": _format_datetime(login.get("timestamp")),
                "ip_address": login.get("ip_address", ""),
                "user_agent": login.get("user_agent", "")
            })
        
        user_details = {
            "id": str(user["_id"]),
            "username": user.get("username", ""),
            "name": user.get("name", ""),
            "phone": user.get("phone", ""),
            "email": user.get("email", ""),
            "is_admin": user.get("is_admin", False),
            "is_active": user.get("is_active", True),
            "created_at": _format_datetime(user.get("created_at")),
            "updated_at": _format_datetime(user.get("updated_at")),
            "last_login": _format_datetime(user.get("last_login")),
            "login_history": login_history,
            "orders": orders_data,
            "total_orders": len(orders_data),
            "total_spent": sum(order["total_amount"] for order in orders_data)
        }
        
        return jsonify({
            "success": True,
            "user": user_details
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/admin/users/<user_id>/login-history")
def get_user_login_history(user_id):
    """Admin: Get user's complete login history"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        user = users_col.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        login_history = []
        for login in user.get("login_history", []):
            login_history.append({
                "timestamp": _format_datetime(login.get("timestamp")),
                "ip_address": login.get("ip_address", ""),
                "user_agent": login.get("user_agent", "")
            })
        
        return jsonify({
            "success": True,
            "username": user.get("username", ""),
            "login_history": login_history,
            "total_logins": len(login_history)
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/admin/users/<user_id>/orders")
def get_user_orders(user_id):
    """Admin: Get all orders for a specific user"""
    try:
        orders_col = MongoDBCollections.get_collection("orders")
        orders = list(orders_col.find({"user_id": ObjectId(user_id)}))
        
        orders_data = []
        for order in orders:
            orders_data.append({
                "id": str(order["_id"]),
                "items": order.get("items", []),
                "total_amount": order.get("total_amount", 0),
                "payment_method": order.get("payment_method", ""),
                "payment_status": order.get("payment_status", ""),
                "order_status": order.get("order_status", ""),
                "created_at": _format_datetime(order.get("created_at")),
                "shipping_address": order.get("shipping_address", {})
            })
        
        return jsonify({
            "success": True,
            "orders": orders_data,
            "total": len(orders_data),
            "total_spent": sum(order["total_amount"] for order in orders_data)
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/admin/dashboard/stats")
def get_admin_dashboard_stats():
    """Admin: Get dashboard statistics"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        orders_col = MongoDBCollections.get_collection("orders")
        products_col = MongoDBCollections.get_collection("products")
        
        total_users = users_col.count_documents({})
        total_orders = orders_col.count_documents({})
        total_products = products_col.count_documents({})
        
        # Calculate total revenue
        orders = list(orders_col.find({}))
        total_revenue = sum(order.get("total_amount", 0) for order in orders)
        
        # Get recent logins
        all_users = list(users_col.find({}).sort("last_login", -1).limit(5))
        recent_logins = [
            {
                "username": user.get("username", ""),
                "name": user.get("name", ""),
                "last_login": user.get("last_login", "").isoformat() if user.get("last_login") else None
            }
            for user in all_users if user.get("last_login")
        ]
        
        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_orders": total_orders,
                "total_products": total_products,
                "total_revenue": total_revenue,
                "recent_logins": recent_logins
            }
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= PRODUCT REVIEWS & RATINGS =============

@app.post("/api/products/<product_id>/reviews")
def add_product_review_v2(product_id):
    """Add a review to a product (MongoDB version)"""
    try:
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        username = payload.get("username")
        rating = int(payload.get("rating", 0))
        review_text = payload.get("review_text", "").strip()
        
        if not user_id or not username or rating < 1 or rating > 5:
            return jsonify({"success": False, "message": "Invalid input"}), 400
        
        reviews_col = MongoDBCollections.get_collection("reviews")
        products_col = MongoDBCollections.get_collection("products")
        
        # Check if user already reviewed this product
        existing = reviews_col.find_one({"product_id": ObjectId(product_id), "user_id": ObjectId(user_id)})
        if existing:
            return jsonify({"success": False, "message": "You already reviewed this product"}), 409
        
        review_doc = {
            "product_id": ObjectId(product_id),
            "user_id": ObjectId(user_id),
            "username": username,
            "rating": rating,
            "review_text": review_text,
            "created_at": datetime.now(timezone.utc),
            "helpful_count": 0
        }
        
        result = reviews_col.insert_one(review_doc)
        
        # Update product average rating
        all_reviews = list(reviews_col.find({"product_id": ObjectId(product_id)}))
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        products_col.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"average_rating": avg_rating, "reviews_count": len(all_reviews)}}
        )
        
        return jsonify({
            "success": True,
            "review_id": str(result.inserted_id),
            "average_rating": avg_rating
        }), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/products/<product_id>/reviews")
def get_product_reviews_v2(product_id):
    """Get all reviews for a product (MongoDB version)"""
    try:
        reviews_col = MongoDBCollections.get_collection("reviews")
        reviews = list(reviews_col.find({"product_id": ObjectId(product_id)}).sort("created_at", -1))
        
        reviews_data = []
        for review in reviews:
            reviews_data.append({
                "id": str(review["_id"]),
                "username": review.get("username", "Anonymous"),
                "rating": review.get("rating", 0),
                "review_text": review.get("review_text", ""),
                "created_at": review.get("created_at", "").isoformat() if review.get("created_at") else None,
                "helpful_count": review.get("helpful_count", 0)
            })
        
        return jsonify({"success": True, "reviews": reviews_data}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= ADVANCED SEARCH & FILTERS =============

@app.get("/api/products/search/advanced")
def advanced_product_search():
    """Advanced product search with multiple filters"""
    try:
        query = request.args.get("q", "").strip()
        category = request.args.get("category", "").strip()
        min_price = request.args.get("min_price", type=float)
        max_price = request.args.get("max_price", type=float)
        min_rating = request.args.get("min_rating", type=float)
        sort_by = request.args.get("sort_by", "name")  # name, price_low, price_high, rating, newest
        in_stock_only = request.args.get("in_stock", "false").lower() == "true"
        
        products_col = MongoDBCollections.get_collection("products")
        
        # Build filter
        filter_query = {}
        if query:
            filter_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        if category:
            filter_query["category"] = {"$regex": category, "$options": "i"}
        if min_price is not None or max_price is not None:
            price_filter = {}
            if min_price is not None:
                price_filter["$gte"] = min_price
            if max_price is not None:
                price_filter["$lte"] = max_price
            filter_query["price"] = price_filter
        if min_rating is not None:
            filter_query["average_rating"] = {"$gte": min_rating}
        if in_stock_only:
            filter_query["stock_quantity"] = {"$gt": 0}
        
        # Build sort
        sort_mapping = {
            "name": ("name", 1),
            "price_low": ("price", 1),
            "price_high": ("price", -1),
            "rating": ("average_rating", -1),
            "newest": ("created_at", -1)
        }
        sort_field, sort_order = sort_mapping.get(sort_by, ("name", 1))
        
        products = list(products_col.find(filter_query).sort(sort_field, sort_order))
        
        products_data = []
        for p in products:
            products_data.append({
                "id": str(p["_id"]),
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "price": p.get("price", 0),
                "stock_quantity": p.get("stock_quantity", 0),
                "category": p.get("category", ""),
                "image_url": p.get("image_url", ""),
                "average_rating": p.get("average_rating", 0),
                "reviews_count": p.get("reviews_count", 0)
            })
        
        return jsonify({"success": True, "products": products_data, "total": len(products_data)}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= MULTIPLE SHIPPING ADDRESSES =============

@app.post("/api/users/<user_id>/addresses")
def add_shipping_address(user_id):
    """Add a shipping address to user"""
    try:
        payload = request.get_json(silent=True) or {}
        address = {
            "label": payload.get("label", "Home"),
            "street": payload.get("street", ""),
            "city": payload.get("city", ""),
            "state": payload.get("state", ""),
            "zip_code": payload.get("zip_code", ""),
            "country": payload.get("country", "India"),
            "is_default": payload.get("is_default", False)
        }
        
        users_col = MongoDBCollections.get_collection("users")
        
        # If this is default, unset other defaults
        if address["is_default"]:
            users_col.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"addresses.$[].is_default": False}}
            )
        
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"addresses": address}}
        )
        
        return jsonify({"success": True, "message": "Address added"}), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/users/<user_id>/addresses")
def get_shipping_addresses(user_id):
    """Get all shipping addresses for user"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        user = users_col.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        addresses = user.get("addresses", [])
        return jsonify({"success": True, "addresses": addresses}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= LOW STOCK ALERTS (ADMIN) =============

@app.get("/api/admin/products/low-stock")
def get_low_stock_products():
    """Get products with low stock"""
    try:
        threshold = request.args.get("threshold", 5, type=int)
        products_col = MongoDBCollections.get_collection("products")
        
        low_stock = list(products_col.find({"stock_quantity": {"$lte": threshold, "$gt": 0}}).sort("stock_quantity", 1))
        out_of_stock = list(products_col.find({"stock_quantity": 0}))
        
        low_stock_data = [{
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "stock_quantity": p.get("stock_quantity", 0),
            "category": p.get("category", ""),
            "price": p.get("price", 0)
        } for p in low_stock]
        
        out_of_stock_data = [{
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "price": p.get("price", 0)
        } for p in out_of_stock]
        
        return jsonify({
            "success": True,
            "low_stock": low_stock_data,
            "out_of_stock": out_of_stock_data,
            "low_stock_count": len(low_stock_data),
            "out_of_stock_count": len(out_of_stock_data)
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= SALES ANALYTICS (ADMIN) =============

@app.get("/api/admin/analytics/sales")
def get_sales_analytics():
    """Get comprehensive sales analytics"""
    try:
        period = request.args.get("period", "week")  # day, week, month, year
        
        orders_col = MongoDBCollections.get_collection("orders")
        products_col = MongoDBCollections.get_collection("products")
        users_col = MongoDBCollections.get_collection("users")
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        if period == "day":
            start_date = now - timedelta(days=1)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # year
            start_date = now - timedelta(days=365)
        
        # Get orders in period
        orders = list(orders_col.find({"created_at": {"$gte": start_date}}))
        
        # Calculate metrics
        total_revenue = sum(o.get("total_amount", 0) for o in orders)
        total_orders = len(orders)
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Best selling products
        product_sales = {}
        for order in orders:
            for item in order.get("items", []):
                product_name = item.get("name", "Unknown")
                product_sales[product_name] = product_sales.get(product_name, 0) + item.get("quantity", 0)
        
        best_sellers = sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Revenue by day
        daily_revenue = {}
        for order in orders:
            date = order.get("created_at").strftime("%Y-%m-%d") if order.get("created_at") else "Unknown"
            daily_revenue[date] = daily_revenue.get(date, 0) + order.get("total_amount", 0)
        
        revenue_trend = sorted(daily_revenue.items())
        
        # New customers
        new_customers = users_col.count_documents({"created_at": {"$gte": start_date}})
        
        return jsonify({
            "success": True,
            "analytics": {
                "period": period,
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "avg_order_value": avg_order_value,
                "best_sellers": [{"product": p, "quantity": q} for p, q in best_sellers],
                "revenue_trend": [{"date": d, "revenue": r} for d, r in revenue_trend],
                "new_customers": new_customers
            }
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= USER NOTIFICATIONS =============

@app.post("/api/notifications")
def create_notification():
    """Create a notification for a user"""
    try:
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        title = payload.get("title", "")
        message = payload.get("message", "")
        notification_type = payload.get("type", "info")  # info, success, warning, error
        
        notifications_col = MongoDBCollections.get_collection("notifications")
        
        notification = {
            "user_id": ObjectId(user_id),
            "title": title,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = notifications_col.insert_one(notification)
        
        return jsonify({"success": True, "notification_id": str(result.inserted_id)}), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/users/<user_id>/notifications")
def get_user_notifications(user_id):
    """Get all notifications for a user"""
    try:
        notifications_col = MongoDBCollections.get_collection("notifications")
        notifications = list(notifications_col.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).limit(50))
        
        notifications_data = []
        for n in notifications:
            notifications_data.append({
                "id": str(n["_id"]),
                "title": n.get("title", ""),
                "message": n.get("message", ""),
                "type": n.get("type", "info"),
                "read": n.get("read", False),
                "created_at": n.get("created_at", "").isoformat() if n.get("created_at") else None
            })
        
        unread_count = sum(1 for n in notifications_data if not n["read"])
        
        return jsonify({
            "success": True,
            "notifications": notifications_data,
            "unread_count": unread_count
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.put("/api/notifications/<notification_id>/read")
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notifications_col = MongoDBCollections.get_collection("notifications")
        notifications_col.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )
        
        return jsonify({"success": True}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= RECENTLY VIEWED PRODUCTS =============

@app.post("/api/users/<user_id>/recently-viewed")
def add_recently_viewed(user_id):
    """Track recently viewed product"""
    try:
        payload = request.get_json(silent=True) or {}
        product_id = payload.get("product_id")
        
        users_col = MongoDBCollections.get_collection("users")
        
        # Remove if already exists, then add to front
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"recently_viewed": product_id}}
        )
        
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"recently_viewed": {"$each": [product_id], "$position": 0, "$slice": 20}}}
        )
        
        return jsonify({"success": True}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/users/<user_id>/recently-viewed")
def get_recently_viewed(user_id):
    """Get recently viewed products"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        products_col = MongoDBCollections.get_collection("products")
        
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        product_ids = [ObjectId(pid) for pid in user.get("recently_viewed", [])]
        products = list(products_col.find({"_id": {"$in": product_ids}}))
        
        products_data = []
        for p in products:
            products_data.append({
                "id": str(p["_id"]),
                "name": p.get("name", ""),
                "price": p.get("price", 0),
                "image_url": p.get("image_url", ""),
                "category": p.get("category", "")
            })
        
        return jsonify({"success": True, "products": products_data}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= PRODUCT RECOMMENDATIONS =============

@app.get("/api/users/<user_id>/recommendations")
def get_product_recommendations(user_id):
    """Get personalized product recommendations"""
    try:
        users_col = MongoDBCollections.get_collection("users")
        products_col = MongoDBCollections.get_collection("products")
        orders_col = MongoDBCollections.get_collection("orders")
        
        # Get user's purchase history
        orders = list(orders_col.find({"user_id": ObjectId(user_id)}))
        purchased_categories = set()
        for order in orders:
            for item in order.get("items", []):
                # Get product category
                product = products_col.find_one({"name": item.get("name")})
                if product:
                    purchased_categories.add(product.get("category", ""))
        
        # Recommend products from same categories
        if purchased_categories:
            recommendations = list(products_col.find({
                "category": {"$in": list(purchased_categories)},
                "stock_quantity": {"$gt": 0}
            }).sort("average_rating", -1).limit(10))
        else:
            # New user - recommend top rated products
            recommendations = list(products_col.find({
                "stock_quantity": {"$gt": 0}
            }).sort("average_rating", -1).limit(10))
        
        recommendations_data = []
        for p in recommendations:
            recommendations_data.append({
                "id": str(p["_id"]),
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "price": p.get("price", 0),
                "image_url": p.get("image_url", ""),
                "category": p.get("category", ""),
                "average_rating": p.get("average_rating", 0)
            })
        
        return jsonify({"success": True, "recommendations": recommendations_data}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= BULK OPERATIONS (ADMIN) =============

@app.post("/api/admin/products/bulk-update-stock")
def bulk_update_stock():
    """Bulk update product stock"""
    try:
        payload = request.get_json(silent=True) or {}
        updates = payload.get("updates", [])  # [{"product_id": "...", "stock_quantity": 10}, ...]
        
        products_col = MongoDBCollections.get_collection("products")
        
        updated_count = 0
        for update in updates:
            product_id = update.get("product_id")
            stock_quantity = update.get("stock_quantity")
            
            if product_id and stock_quantity is not None:
                products_col.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$set": {"stock_quantity": stock_quantity}}
                )
                updated_count += 1
        
        return jsonify({
            "success": True,
            "message": f"Updated {updated_count} products",
            "updated_count": updated_count
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ============= CUSTOMER SUPPORT CHAT =============

@app.post("/api/chat/messages")
def send_chat_message():
    """Send a chat message"""
    try:
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        username = payload.get("username")
        message = payload.get("message", "").strip()
        is_admin = payload.get("is_admin", False)
        
        if not message:
            return jsonify({"success": False, "message": "Message cannot be empty"}), 400
        
        chats_col = MongoDBCollections.get_collection("chats")
        
        message_doc = {
            "user_id": ObjectId(user_id) if user_id else None,
            "username": username,
            "message": message,
            "is_admin": is_admin,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = chats_col.insert_one(message_doc)
        
        return jsonify({
            "success": True,
            "message_id": str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/api/chat/messages")
def get_chat_messages():
    """Get chat messages"""
    try:
        user_id = request.args.get("user_id")
        limit = request.args.get("limit", 50, type=int)
        
        chats_col = MongoDBCollections.get_collection("chats")
        
        query = {}
        if user_id:
            query["$or"] = [
                {"user_id": ObjectId(user_id)},
                {"is_admin": True}
            ]
        
        messages = list(chats_col.find(query).sort("created_at", -1).limit(limit))
        messages.reverse()  # Show oldest first
        
        messages_data = []
        for m in messages:
            messages_data.append({
                "id": str(m["_id"]),
                "username": m.get("username", "Anonymous"),
                "message": m.get("message", ""),
                "is_admin": m.get("is_admin", False),
                "created_at": m.get("created_at", "").isoformat() if m.get("created_at") else None
            })
        
        return jsonify({"success": True, "messages": messages_data}), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Ensure tables exist for both local runs and production WSGI servers (e.g., gunicorn).
_init_db()

if __name__ == "__main__":
    debug_enabled = os.getenv("FLASK_DEBUG", "0").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=5000, debug=debug_enabled, use_reloader=False)
