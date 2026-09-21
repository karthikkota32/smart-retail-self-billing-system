# MongoDB + SQLite Setup Guide for Smart Retail

## Installation Status ✓
- ✓ MongoDB drivers installed (`pymongo==4.6.0`)
- ✓ Flask-PyMongo installed (`flask-pymongo==2.3.0`)
- ✓ SQLAlchemy installed (`Flask-SQLAlchemy==3.1.1`)
- ✓ Requirements updated

---

## Setup Steps

### 1. **Install MongoDB Locally (for Development)**

**Option A: Download and Install**
- Visit: https://www.mongodb.com/try/download/community
- Download MongoDB Community Edition for Windows
- Run installer and follow setup wizard
- Default port: `27017`

**Option B: Use MongoDB Atlas (Cloud)**
- Visit: https://www.mongodb.com/cloud/atlas
- Create free account
- Create a cluster
- Get connection string: `mongodb+srv://username:password@cluster.mongodb.net`

---

### 2. **Configure Environment Variables**

Create a `.env` file in `backend/` folder:

```env
FLASK_ENV=development
FLASK_DEBUG=1
ALLOWED_ORIGINS=http://localhost:5173

# Local MongoDB (Development)
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=groceryDB

# OR MongoDB Atlas (Production)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net

# Email Configuration
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

---

### 3. **Using MongoDB in Your Flask Routes**

Import and use in `app.py`:

```python
from mongo_config import MongoDBCollections

# Create collections on startup
MongoDBCollections.init_collections()

# Example: Create a user route using MongoDB
@app.route('/api/users', methods=['POST'])
def create_user():
    users_collection = MongoDBCollections.get_collection("users")
    
    data = request.json
    
    # Insert user document
    result = users_collection.insert_one({
        "username": data.get("username"),
        "email": data.get("email"),
        "phone": data.get("phone")
    })
    
    return jsonify({"success": True, "user_id": str(result.inserted_id)}), 201

# Example: Get all users
@app.route('/api/users', methods=['GET'])
def get_users():
    users_collection = MongoDBCollections.get_collection("users")
    
    users = list(users_collection.find())
    
    # Convert ObjectId to string for JSON serialization
    for user in users:
        user['_id'] = str(user['_id'])
    
    return jsonify(users), 200
```

---

## Comparison: SQLite vs MongoDB

| Feature | SQLite | MongoDB |
|---------|--------|---------|
| Type | Relational (SQL) | NoSQL (Document) |
| Schema | Fixed structure | Flexible (JSON-like) |
| Best For | Small projects, local dev | Large data, flexibility |
| Data Format | Tables & Rows | Collections & Documents |
| Relationships | Joins | Nested documents |
| Scaling | Vertical | Horizontal |

---

## MongoDB Common Operations

### Insert
```python
users_collection.insert_one({"name": "John", "age": 30})
users_collection.insert_many([{"name": "Jane"}, {"name": "Bob"}])
```

### Read
```python
user = users_collection.find_one({"name": "John"})
all_users = list(users_collection.find())
users_filtered = list(users_collection.find({"age": {"$gte": 25}}))
```

### Update
```python
users_collection.update_one(
    {"name": "John"},
    {"$set": {"age": 31}}
)

users_collection.update_many(
    {"status": "active"},
    {"$set": {"verified": True}}
)
```

### Delete
```python
users_collection.delete_one({"name": "John"})
users_collection.delete_many({"status": "inactive"})
```

---

## Using Both SQLite and MongoDB

You can use both databases in the same project:

```python
from mongo_config import MongoDBCollections
from sqlalchemy import create_engine

# SQLite for structured data (users, orders)
# MongoDB for flexible data (reviews, logs, analytics)

# Store user in SQLite
from models import User  # SQLAlchemy model
db.session.add(User(username="john", email="john@example.com"))
db.session.commit()

# Store user review in MongoDB
reviews_col = MongoDBCollections.get_collection("reviews")
reviews_col.insert_one({
    "user_id": user_id,
    "product_id": product_id,
    "rating": 5,
    "comment": "Great product!",
    "timestamp": datetime.now()
})
```

---

## Troubleshooting

### MongoDB Connection Error
```
Error: Failed to connect to MongoDB
Solution: 
1. Make sure MongoDB service is running
   - Windows: Services app → MongoDB → Start
   - Or run: mongod
2. Check MONGO_URI in .env file
3. Verify MongoDB is listening on port 27017
```

### JSONEncoder Error (ObjectId)
```python
# MongoDB returns ObjectId which is not JSON serializable
# Solution: Convert to string

from bson import ObjectId

user = users_collection.find_one({"_id": ObjectId("...")})
user['_id'] = str(user['_id'])  # Convert ObjectId to string
return jsonify(user)
```

---

## Next Steps

1. ✓ Start MongoDB service
2. ✓ Update `.env` with MongoDB URI
3. ✓ Import `mongo_config` in `app.py`
4. ✓ Create routes using `MongoDBCollections`
5. ✓ Test with Postman or API client

---

## Resources
- MongoDB Docs: https://docs.mongodb.com
- PyMongo Docs: https://pymongo.readthedocs.io
- Flask-PyMongo: https://flask-pymongo.readthedocs.io
