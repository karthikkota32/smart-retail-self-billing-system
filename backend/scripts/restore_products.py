import json
from pathlib import Path
from datetime import datetime, timezone
from pymongo import MongoClient

uri = 'mongodb+srv://kkreddy1236_db_user:kota1236@smart-retail-cluster.zh39qmf.mongodb.net/groceryDB?retryWrites=true&w=majority&appName=smart-retail-cluster'
client = MongoClient(uri, serverSelectionTimeoutMS=5000)
db = client['groceryDB']
products_col = db['products']

with open('backend/sample_data/products.json', 'r', encoding='utf-8') as f:
    sample_products = json.load(f)

for p in sample_products:
    stock = float(p.get('stock_quantity', 100))
    p['stock'] = stock
    p['stock_quantity'] = stock
    p['stockQuantity'] = stock
    p['updated_at'] = datetime.now(timezone.utc)
    products_col.update_one({'name': p['name']}, {'$set': p}, upsert=True)

print(f'[OK] Synced {len(sample_products)} products in MongoDB Atlas with healthy stock!')
