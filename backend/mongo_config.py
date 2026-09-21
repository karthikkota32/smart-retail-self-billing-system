"""
MongoDB Configuration for Flask Application
Supports both SQLite and MongoDB simultaneously
"""

import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DATABASE_NAME = os.getenv("MONGO_DB_NAME", "groceryDB")

mongo_client = None
mongo_db = None
mongo_connection_error = None


def _build_mongo_client():
    return MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
    )


try:
    mongo_client = _build_mongo_client()
    mongo_client.admin.command("ping")
    mongo_db = mongo_client[MONGO_DATABASE_NAME]
    print(f"[OK] MongoDB Connected Successfully to database '{MONGO_DATABASE_NAME}'")
except Exception as e:
    mongo_connection_error = f"{type(e).__name__}: {e}"
    print(f"[ERROR] MongoDB Connection Error: {mongo_connection_error}")
    mongo_client = None
    mongo_db = None


class MongoDBCollections:
    """Define MongoDB collections"""

    @staticmethod
    def get_connection_status():
        """Return a detailed MongoDB connection status payload."""
        if mongo_client is None or mongo_db is None:
            return {
                "connected": False,
                "database": MONGO_DATABASE_NAME,
                "error": mongo_connection_error or "MongoDB client is unavailable",
                "collections": [],
                "documentCounts": {},
            }

        try:
            mongo_client.admin.command("ping")
            collections = mongo_db.list_collection_names()
            document_counts = {}

            for collection_name in collections:
                try:
                    document_counts[collection_name] = mongo_db[collection_name].count_documents({})
                except Exception as count_error:
                    document_counts[collection_name] = f"count failed: {type(count_error).__name__}: {count_error}"

            return {
                "connected": True,
                "database": mongo_db.name,
                "collections": collections,
                "documentCounts": document_counts,
                "error": None,
            }
        except Exception as e:
            return {
                "connected": False,
                "database": MONGO_DATABASE_NAME,
                "error": f"{type(e).__name__}: {e}",
                "collections": [],
                "documentCounts": {},
            }

    @staticmethod
    def get_collection(collection_name):
        """Get a MongoDB collection"""
        if mongo_db is None:
            details = mongo_connection_error or "MongoDB client is unavailable"
            raise ConnectionError(f"MongoDB is not connected: {details}")
        return mongo_db[collection_name]

    @staticmethod
    def init_collections():
        """Create default collections if they don't exist"""
        if mongo_db is None:
            details = mongo_connection_error or "MongoDB client is unavailable"
            raise ConnectionError(f"MongoDB is not connected: {details}")

        collections = [
            "users",
            "products",
            "orders",
            "coupons",
            "cart",
            "wishlist",
            "reviews",
            "notifications",
            "chats",
        ]

        existing_collections = set(mongo_db.list_collection_names())

        for collection in collections:
            if collection not in existing_collections:
                mongo_db.create_collection(collection)
                print(f"[OK] Collection '{collection}' created")


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
