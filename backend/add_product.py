"""
Script to manually add products to MongoDB
Run this from the backend folder: python add_product.py
"""

from mongo_config import MongoDBCollections
from datetime import datetime

def add_product():
    """Add a single product to MongoDB"""
    
    # Get the products collection
    products = MongoDBCollections.get_collection('products')
    
    # Product data - MODIFY THIS to add different products
    product = {
        "name": "Sample Product",
        "price": 29.99,
        "description": "This is a sample product description",
        "category": "Electronics",
        "brand": "SampleBrand",
        "stock": 100,
        "image_url": "https://example.com/image.jpg",
        "barcode": "1234567890",
        "discount": 10,  # percentage
        "rating": 4.5,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    try:
        # Insert the product
        result = products.insert_one(product)
        print(f"✓ Product added successfully!")
        print(f"Product ID: {result.inserted_id}")
        return result.inserted_id
    except Exception as e:
        print(f"✗ Error adding product: {e}")
        return None

def add_multiple_products():
    """Add multiple products at once"""
    
    products_collection = MongoDBCollections.get_collection('products')
    
    # List of products - MODIFY THIS to add multiple products
    products = [
        {
            "name": "Laptop",
            "price": 999.99,
            "description": "High-performance laptop",
            "category": "Electronics",
            "brand": "TechBrand",
            "stock": 50,
            "image_url": "https://example.com/laptop.jpg",
            "barcode": "1111111111",
            "discount": 5,
            "rating": 4.7,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Wireless Mouse",
            "price": 25.99,
            "description": "Ergonomic wireless mouse",
            "category": "Accessories",
            "brand": "TechBrand",
            "stock": 200,
            "image_url": "https://example.com/mouse.jpg",
            "barcode": "2222222222",
            "discount": 0,
            "rating": 4.3,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "USB-C Cable",
            "price": 12.99,
            "description": "Fast charging USB-C cable",
            "category": "Accessories",
            "brand": "CableCo",
            "stock": 500,
            "image_url": "https://example.com/cable.jpg",
            "barcode": "3333333333",
            "discount": 15,
            "rating": 4.1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    try:
        result = products_collection.insert_many(products)
        print(f"✓ {len(result.inserted_ids)} products added successfully!")
        for idx, product_id in enumerate(result.inserted_ids, 1):
            print(f"Product {idx} ID: {product_id}")
        return result.inserted_ids
    except Exception as e:
        print(f"✗ Error adding products: {e}")
        return None

def view_all_products():
    """View all products in the database"""
    
    products = MongoDBCollections.get_collection('products')
    
    try:
        all_products = list(products.find())
        if all_products:
            print(f"\n{'='*60}")
            print(f"Total products in database: {len(all_products)}")
            print(f"{'='*60}\n")
            
            for idx, product in enumerate(all_products, 1):
                print(f"Product {idx}:")
                print(f"  ID: {product['_id']}")
                print(f"  Name: {product.get('name', 'N/A')}")
                print(f"  Price: ${product.get('price', 0)}")
                print(f"  Stock: {product.get('stock', 0)}")
                print(f"  Category: {product.get('category', 'N/A')}")
                print(f"  Brand: {product.get('brand', 'N/A')}")
                print("-" * 60)
        else:
            print("No products found in database.")
    except Exception as e:
        print(f"✗ Error viewing products: {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("MongoDB Product Management Script")
    print("="*60 + "\n")
    
    print("Choose an option:")
    print("1. Add a single product")
    print("2. Add multiple products")
    print("3. View all products")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        print("\nAdding single product...")
        add_product()
    elif choice == "2":
        print("\nAdding multiple products...")
        add_multiple_products()
    elif choice == "3":
        print("\n")
        view_all_products()
    elif choice == "4":
        print("Exiting...")
    else:
        print("Invalid choice!")
    
    print("\n" + "="*60 + "\n")
