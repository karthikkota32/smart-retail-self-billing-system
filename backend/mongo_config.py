"""
MongoDB Configuration for Flask Application
Supports both SQLite and MongoDB simultaneously
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB Connection Settings
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017/smart_retail"
)

# Initialize MongoDB connection
try:
    mongo_client = MongoClient(MONGO_URI)
    # Check connection
    mongo_client.admin.command('ping')
    mongo_db = mongo_client.get_database()
    print("✓ MongoDB Connected Successfully")
except Exception as e:
    print(f"✗ MongoDB Connection Error: {e}")
    mongo_db = None


class MongoDBCollections:
    """Define MongoDB collections"""
    
    @staticmethod
    def get_collection(collection_name):
        """Get a MongoDB collection"""
        if mongo_db is None:
            raise Exception("MongoDB is not connected")
        return mongo_db[collection_name]
    
    @staticmethod
    def init_collections():
        """Create default collections if they don't exist"""
        collections = [
            "users",
            "products",
            "orders",
            "coupons",
            "cart",
            "wishlist",
            "reviews"
        ]
        
        for collection in collections:
            if collection not in mongo_db.list_collection_names():
                mongo_db.create_collection(collection)
                print(f"✓ Collection '{collection}' created")


# Example Usage in Flask routes:
"""
from mongo_config import MongoDBCollections

# Get a collection
users_collection = MongoDBCollections.get_collection("users")

# Insert a document
user_doc = {
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "1234567890"
}
result = users_collection.insert_one(user_doc)
print(f"Inserted ID: {result.inserted_id}")

# Find a document
user = users_collection.find_one({"username": "john_doe"})
print(user)

# Update a document
users_collection.update_one(
    {"username": "john_doe"},
    {"$set": {"email": "newemail@example.com"}}
)

# Delete a document
users_collection.delete_one({"username": "john_doe"})

# Query multiple documents
all_users = users_collection.find()
for user in all_users:
    print(user)
"""
