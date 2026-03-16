"""
MongoDB Collection Schemas for Smart Retail
These are example document structures (not enforced schema validation)
"""

# USERS Collection
users_schema = {
    "_id": "ObjectId",
    "username": "string (unique)",
    "email": "string (unique)",
    "name": "string",
    "phone": "string (10 digits)",
    "password_hash": "string",
    "created_at": "datetime",
    "updated_at": "datetime",
    "last_login": "datetime",
    "is_admin": "boolean",
    "is_active": "boolean"
}

# PRODUCTS Collection
products_schema = {
    "_id": "ObjectId",
    "name": "string",
    "description": "string",
    "price": "float",
    "stock_quantity": "integer",
    "category": "string",
    "image_url": "string",
    "location": "string",
    "rating": "float (0-5)",
    "reviews_count": "integer",
    "created_at": "datetime",
    "updated_at": "datetime",
    "is_active": "boolean"
}

# ORDERS Collection
orders_schema = {
    "_id": "ObjectId",
    "user_id": "ObjectId (ref to users)",
    "order_number": "string (unique)",
    "status": "string (pending, shipped, delivered, cancelled)",
    "items": [
        {
            "product_id": "ObjectId",
            "product_name": "string",
            "quantity": "integer",
            "price": "float",
            "subtotal": "float"
        }
    ],
    "total_amount": "float",
    "discount_applied": "float",
    "final_amount": "float",
    "payment_method": "string (credit_card, debit_card, upi)",
    "payment_status": "string (pending, completed, failed)",
    "shipping_address": {
        "street": "string",
        "city": "string",
        "state": "string",
        "zip_code": "string",
        "country": "string"
    },
    "created_at": "datetime",
    "delivered_at": "datetime"
}

# COUPONS Collection
coupons_schema = {
    "_id": "ObjectId",
    "code": "string (unique)",
    "discount_type": "string (percentage, fixed)",
    "discount_value": "float",
    "max_usage": "integer",
    "usage_count": "integer",
    "valid_from": "datetime",
    "valid_until": "datetime",
    "min_purchase_amount": "float",
    "applicable_categories": ["string"],
    "is_active": "boolean",
    "created_by": "ObjectId (ref to users/admin)"
}

# CART Collection
cart_schema = {
    "_id": "ObjectId",
    "user_id": "ObjectId (ref to users)",
    "items": [
        {
            "product_id": "ObjectId",
            "quantity": "integer",
            "added_at": "datetime"
        }
    ],
    "coupon_code": "string (optional)",
    "total_items": "integer",
    "total_price": "float",
    "last_updated": "datetime"
}

# WISHLIST Collection
wishlist_schema = {
    "_id": "ObjectId",
    "user_id": "ObjectId (ref to users)",
    "items": [
        {
            "product_id": "ObjectId",
            "added_at": "datetime"
        }
    ],
    "last_updated": "datetime"
}

# REVIEWS Collection
reviews_schema = {
    "_id": "ObjectId",
    "product_id": "ObjectId (ref to products)",
    "user_id": "ObjectId (ref to users)",
    "rating": "integer (1-5)",
    "title": "string",
    "comment": "string",
    "helpful_count": "integer",
    "created_at": "datetime"
}


# Example: How to use these schemas in Flask routes

"""
from mongo_config import MongoDBCollections
from datetime import datetime
from bson import ObjectId

# CREATE USER
@app.route('/api/users/register', methods=['POST'])
def register_user():
    users_col = MongoDBCollections.get_collection("users")
    data = request.json
    
    user_doc = {
        "username": data.get("username"),
        "email": data.get("email"),
        "name": data.get("name"),
        "phone": data.get("phone"),
        "password_hash": generate_password_hash(data.get("password")),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "is_admin": False,
        "is_active": True
    }
    
    result = users_col.insert_one(user_doc)
    return jsonify({"success": True, "user_id": str(result.inserted_id)}), 201


# CREATE PRODUCT
@app.route('/api/products', methods=['POST'])
def create_product():
    products_col = MongoDBCollections.get_collection("products")
    data = request.json
    
    product_doc = {
        "name": data.get("name"),
        "description": data.get("description"),
        "price": float(data.get("price")),
        "stock_quantity": int(data.get("stock_quantity")),
        "category": data.get("category"),
        "image_url": data.get("image_url"),
        "location": data.get("location"),
        "rating": 0.0,
        "reviews_count": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "is_active": True
    }
    
    result = products_col.insert_one(product_doc)
    return jsonify({"success": True, "product_id": str(result.inserted_id)}), 201


# ADD TO CART
@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    cart_col = MongoDBCollections.get_collection("cart")
    data = request.json
    
    user_id = ObjectId(data.get("user_id"))
    product_id = ObjectId(data.get("product_id"))
    quantity = int(data.get("quantity", 1))
    
    # Check if cart exists
    cart = cart_col.find_one({"user_id": user_id})
    
    if cart:
        # Update existing cart
        cart_col.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "items": {
                        "product_id": product_id,
                        "quantity": quantity,
                        "added_at": datetime.now()
                    }
                },
                "$set": {"last_updated": datetime.now()}
            }
        )
    else:
        # Create new cart
        cart_col.insert_one({
            "user_id": user_id,
            "items": [{
                "product_id": product_id,
                "quantity": quantity,
                "added_at": datetime.now()
            }],
            "coupon_code": None,
            "total_items": quantity,
            "total_price": 0,
            "last_updated": datetime.now()
        })
    
    return jsonify({"success": True, "message": "Added to cart"}), 200
"""
