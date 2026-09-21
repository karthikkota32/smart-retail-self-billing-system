"""
NLP Processing Service for Smart Retail Self-Billing System
Provides:
  - Intent Detection (9 user retail intents)
  - Entity Extraction (Category, Brand, Price Range in ₹, Attributes, Product Keywords)
  - MongoDB Query Generation & Execution
  - Detailed Product Information & Focused Price Lookups
  - Graceful Relaxed Fallback Search
"""

import re
from datetime import datetime
from bson.objectid import ObjectId

# Retail Categories and Synonyms
CATEGORY_SYNONYMS = {
    "Biscuits": [
        "biscuit", "biscuits", "cookie", "cookies", "bourbon", "marie",
        "parle-g", "dark fantasy", "good day", "cracker", "crackers"
    ],
    "Beverages": [
        "beverage", "beverages", "drink", "drinks", "tea", "coffee",
        "green tea", "juice", "juices", "soda", "coke", "diet coke",
        "coconut water", "aam panna", "cooler", "water", "hydration"
    ],
    "Dairy": [
        "dairy", "milk", "butter", "paneer", "curd", "yogurt",
        "cheese", "ghee", "cream", "toned milk"
    ],
    "Grains": [
        "grain", "grains", "rice", "basmati", "masoori", "jasmine",
        "flour", "wheat", "atta", "dal", "pulses", "toor dal", "staple"
    ],
    "Personal Care": [
        "personal care", "shampoo", "soap", "hair care", "hair",
        "conditioner", "skincare", "lotion", "body wash"
    ],
    "Snacks": [
        "snack", "snacks", "noodles", "maggi", "chips", "crisps",
        "namkeen", "instant", "instant food"
    ],
    "Grocery": [
        "grocery", "salt", "sugar", "oil", "spices", "masala"
    ]
}

# Known Retail Brands
KNOWN_BRANDS = [
    "Britannia", "Parle", "Amul", "Nestle", "Tata", "Dove", "L'Oreal",
    "Coca-Cola", "Twinings", "Raw Pressery", "Paper Boat", "Fortune",
    "Royal", "India Gate", "Sunfeast", "Patanjali", "Dabur", "Haldiram's"
]

# Common Product Attributes / Dietary Keywords
ATTRIBUTE_KEYWORDS = [
    "low sugar", "sugar free", "zero sugar", "zero calorie",
    "dry hair", "hair care", "moisture", "hyaluronic",
    "organic", "natural", "pure",
    "high protein", "calcium", "iodized", "fresh",
    "gluten free", "vegan", "whole grain", "diet"
]


class RetailNLPEngine:
    """Natural Language Processing Engine for Retail Queries"""

    @staticmethod
    def clean_text(text: str) -> str:
        """Normalize spaces and lower case text for processing"""
        if not text:
            return ""
        return " ".join(text.strip().split())

    @classmethod
    def extract_price_range(cls, query: str):
        """
        Extract minimum and maximum price constraints from natural query.
        Handles:
          - "under ₹50", "below 50", "less than rs 100", "cheaper than 200", "max 500"
          - "above ₹100", "more than 50", "greater than rs 200", "min 100"
          - "between ₹50 and ₹100", "50 to 100", "50 - 100"
        """
        lower = query.lower()
        currency_regex = r"(?:₹|rs\.?|inr|rupees)?"
        max_price = None
        min_price = None

        # 1. Between X and Y / X to Y / X - Y
        between_pattern = re.search(
            rf"(?:between|from)\s+{currency_regex}\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*{currency_regex}\s*(\d+(?:\.\d+)?)",
            lower
        )
        if between_pattern:
            p1 = float(between_pattern.group(1))
            p2 = float(between_pattern.group(2))
            min_price = min(p1, p2)
            max_price = max(p1, p2)
            return min_price, max_price

        range_hyphen_pattern = re.search(
            rf"{currency_regex}\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*{currency_regex}\s*(\d+(?:\.\d+)?)",
            lower
        )
        if range_hyphen_pattern:
            p1 = float(range_hyphen_pattern.group(1))
            p2 = float(range_hyphen_pattern.group(2))
            min_price = min(p1, p2)
            max_price = max(p1, p2)
            return min_price, max_price

        # 2. Under / Below / Less than / At most / Cheaper than / Within / Max / Up to
        max_pattern = re.search(
            rf"(?:under|below|less than|cheaper than|at most|within|up to|max(?:imum)?)\s+{currency_regex}\s*(\d+(?:\.\d+)?)",
            lower
        )
        if not max_pattern:
            # Check suffix: "₹50 or less", "50 and below"
            max_pattern = re.search(
                rf"{currency_regex}\s*(\d+(?:\.\d+)?)\s*(?:or less|and below|or under)",
                lower
            )

        if max_pattern:
            max_price = float(max_pattern.group(1))

        # 3. Above / Over / More than / Greater than / Min / At least
        min_pattern = re.search(
            rf"(?:above|over|more than|greater than|at least|min(?:imum)?)\s+{currency_regex}\s*(\d+(?:\.\d+)?)",
            lower
        )
        if not min_pattern:
            min_pattern = re.search(
                rf"{currency_regex}\s*(\d+(?:\.\d+)?)\s*(?:or more|and above)",
                lower
            )

        if min_pattern:
            min_price = float(min_pattern.group(1))

        return min_price, max_price

    @classmethod
    def extract_category(cls, query: str):
        """Identify product category from query using synonyms"""
        lower = query.lower()
        for category, synonyms in CATEGORY_SYNONYMS.items():
            for syn in synonyms:
                pattern = rf"\b{re.escape(syn)}\b"
                if re.search(pattern, lower):
                    return category
        return None

    @classmethod
    def extract_brand(cls, query: str):
        """Identify brand name from query"""
        lower = query.lower()
        for brand in KNOWN_BRANDS:
            pattern = rf"\b{re.escape(brand.lower())}\b"
            if re.search(pattern, lower):
                return brand
        return None

    @classmethod
    def extract_attributes(cls, query: str):
        """Extract attributes like low sugar, dry hair, organic, etc."""
        lower = query.lower()
        matched = []
        for attr in ATTRIBUTE_KEYWORDS:
            if attr in lower:
                matched.append(attr)
        return matched

    @classmethod
    def extract_clean_keyword(cls, query: str, category: str = None, brand: str = None, attributes: list = None):
        """
        Strip query noise/intent words to extract core product keyword or phrase.
        Also strips known category words and attributes so we don't over-filter.
        """
        noise_phrases = [
            r"show me\s+(?:the\s+)?",
            r"tell me\s+(?:all\s+)?about\s+",
            r"what is the price of\s+",
            r"how much is\s+",
            r"how much does\s+",
            r"price of\s+",
            r"cost of\s+",
            r"which\s+",
            r"is the cheapest\s*",
            r"is cheapest\s*",
            r"cheapest\s+",
            r"do you have\s+",
            r"is there any\s+",
            r"is\s+",
            r"in stock\s*",
            r"available\s*",
            r"products?\s+(?:from|by)\s+",
            r"products?\s*",
            r"items?\s*",
            r"i want\s+",
            r"i need\s+",
            r"i'm looking for\s+",
            r"looking for\s+",
            r"give me\s+",
            r"search for\s+",
            r"find\s+",
            r"under\s+(?:₹|rs\.?|inr|rupees)?\s*\d+(?:\.\d+)?",
            r"below\s+(?:₹|rs\.?|inr|rupees)?\s*\d+(?:\.\d+)?",
            r"above\s+(?:₹|rs\.?|inr|rupees)?\s*\d+(?:\.\d+)?",
            r"between\s+.*",
            r"(?:₹|rs\.?|inr|rupees)\s*\d+(?:\.\d+)?",
            r"\bfor\b",
            r"\bfrom\b",
            r"\bwith\b",
            r"\bthe\b",
            r"\ba\b",
            r"\ban\b",
            r"\bsome\b",
            r"\bsomething\b",
            r"\bto\b",
            r"\?",
        ]

        cleaned = query.lower()
        for phrase in noise_phrases:
            cleaned = re.sub(phrase, " ", cleaned, flags=re.IGNORECASE)

        # Strip detected brand if present
        if brand:
            cleaned = re.sub(rf"\b{re.escape(brand.lower())}\b", " ", cleaned)

        # Strip detected attributes
        for attr in (attributes or []):
            cleaned = re.sub(rf"\b{re.escape(attr.lower())}\b", " ", cleaned)

        # If category is detected, strip general generic category words (e.g. drinks, beverage, food)
        generic_category_words = ["drinks", "drink", "beverages", "beverage", "dairy", "snacks", "groceries", "grocery"]
        for g_word in generic_category_words:
            cleaned = re.sub(rf"\b{g_word}\b", " ", cleaned)

        cleaned = " ".join(cleaned.split()).strip()
        return cleaned if cleaned else None

    @classmethod
    def detect_intent(cls, query: str, entities: dict) -> str:
        """
        Classify query into one of 9 user intents:
          - GET_PRODUCT_PRICE
          - GET_PRODUCT_INFO
          - GET_PRODUCT_AVAILABILITY
          - FIND_CHEAPEST
          - COMPARE_PRODUCTS
          - FIND_BY_BRAND
          - FIND_BY_CATEGORY
          - SEARCH_PRICE_RANGE
          - PRODUCT_SEARCH
        """
        lower = query.lower()

        # 1. Product comparison
        if re.search(r"\b(compare|comparison|difference between|vs\.?|versus)\b", lower):
            return "COMPARE_PRODUCTS"

        # 2. Product Price
        if re.search(r"\b(what is the price|price of|cost of|how much is|rate of|how much for)\b", lower):
            return "GET_PRODUCT_PRICE"

        # 3. Product Information
        if re.search(r"\b(tell me about|info on|information about|details of|describe|specs of|about this product|ingredients of|nutrition)\b", lower):
            return "GET_PRODUCT_INFO"

        # 4. Cheapest Product
        if re.search(r"\b(cheapest|lowest price|least expensive|most economical|cheaper)\b", lower):
            return "FIND_CHEAPEST"

        # 5. Availability / Stock
        if re.search(r"\b(in stock|available|availability|is there any|do you have|stock of)\b", lower):
            return "GET_PRODUCT_AVAILABILITY"

        # 6. Explicit Brand Intent ("products from Britannia", "Amul items")
        if re.search(r"(?:products?\s+(?:from|by)|items?\s+(?:from|by))\s+", lower) and entities.get("brand"):
            return "FIND_BY_BRAND"

        # 7. Explicit Category Intent ("dairy products", "show me beverages")
        if re.search(r"(?:show me|list|all)\s+([a-z\s]+)\s+products?", lower) and entities.get("category"):
            return "FIND_BY_CATEGORY"

        # 8. Pure Price Range ("products below 100", "under 50")
        if (entities.get("maxPrice") is not None or entities.get("minPrice") is not None) and not entities.get("category") and not entities.get("brand") and not entities.get("productName"):
            return "SEARCH_PRICE_RANGE"

        # Default: General Product Search
        return "PRODUCT_SEARCH"

    @classmethod
    def parse_query(cls, raw_query: str) -> dict:
        """
        Full Natural Language Query Processing pipeline.
        Returns parsed intent, extracted entities, and metadata.
        """
        query = cls.clean_text(raw_query)
        if not query:
            return {
                "intent": "UNKNOWN",
                "entities": {
                    "category": None,
                    "brand": None,
                    "productName": None,
                    "minPrice": None,
                    "maxPrice": None,
                    "attributes": [],
                    "sortBy": None,
                    "inStockOnly": False
                },
                "cleanQuery": ""
            }

        # Extract entities
        min_price, max_price = cls.extract_price_range(query)
        category = cls.extract_category(query)
        brand = cls.extract_brand(query)
        attributes = cls.extract_attributes(query)
        clean_kw = cls.extract_clean_keyword(query, category=category, brand=brand, attributes=attributes)

        # Detect stock constraint
        in_stock_only = bool(re.search(r"\b(in stock|available)\b", query.lower()))

        # Determine sort criteria
        sort_by = None
        if re.search(r"\b(cheapest|lowest price|most economical)\b", query.lower()):
            sort_by = "price_asc"
        elif re.search(r"\b(highest price|most expensive|costliest)\b", query.lower()):
            sort_by = "price_desc"
        elif re.search(r"\b(best rated|top rated|highest rated|popular)\b", query.lower()):
            sort_by = "rating_desc"

        entities = {
            "category": category,
            "brand": brand,
            "productName": clean_kw,
            "minPrice": min_price,
            "maxPrice": max_price,
            "attributes": attributes,
            "sortBy": sort_by,
            "inStockOnly": in_stock_only
        }

        intent = cls.detect_intent(query, entities)

        return {
            "intent": intent,
            "entities": entities,
            "cleanQuery": query
        }

    @classmethod
    def execute_mongo_search(cls, parsed: dict, products_collection) -> dict:
        """
        Executes an intelligent MongoDB query using extracted NLP entities.
        Includes graceful relaxed fallback if strict filters produce 0 matches.
        """
        intent = parsed["intent"]
        entities = parsed["entities"]
        raw_query = parsed["cleanQuery"]

        mongo_filter = {"is_active": True}
        sort_criteria = [("price", 1)] if entities.get("sortBy") == "price_asc" or intent == "FIND_CHEAPEST" else []

        if entities.get("sortBy") == "price_desc":
            sort_criteria = [("price", -1)]
        elif entities.get("sortBy") == "rating_desc":
            sort_criteria = [("rating", -1)]

        # Category Filter
        if entities.get("category"):
            mongo_filter["category"] = {"$regex": f"^{re.escape(entities['category'])}$", "$options": "i"}

        # Brand Filter
        if entities.get("brand"):
            mongo_filter["brand"] = {"$regex": f"^{re.escape(entities['brand'])}$", "$options": "i"}

        # Price Constraints
        price_conditions = {}
        if entities.get("minPrice") is not None:
            price_conditions["$gte"] = entities["minPrice"]
        if entities.get("maxPrice") is not None:
            price_conditions["$lte"] = entities["maxPrice"]
        if price_conditions:
            mongo_filter["price"] = price_conditions

        # Stock availability
        if entities.get("inStockOnly") or intent == "GET_PRODUCT_AVAILABILITY":
            mongo_filter["stock_quantity"] = {"$gt": 0}

        # Keyword matching across Name, Description, Attributes
        kw = entities.get("productName")
        if kw and kw.lower() != (entities.get("category") or "").lower():
            kw_regex = re.escape(kw)
            mongo_filter["$or"] = [
                {"name": {"$regex": kw_regex, "$options": "i"}},
                {"description": {"$regex": kw_regex, "$options": "i"}},
                {"attributes": {"$elemMatch": {"$regex": kw_regex, "$options": "i"}}}
            ]

        # Attribute filters (e.g. low sugar, dry hair)
        if entities.get("attributes"):
            attr_conditions = []
            for attr in entities["attributes"]:
                attr_conditions.append({
                    "$or": [
                        {"name": {"$regex": re.escape(attr), "$options": "i"}},
                        {"description": {"$regex": re.escape(attr), "$options": "i"}},
                        {"attributes": {"$elemMatch": {"$regex": re.escape(attr), "$options": "i"}}}
                    ]
                })
            if attr_conditions:
                if "$and" in mongo_filter:
                    mongo_filter["$and"].extend(attr_conditions)
                else:
                    mongo_filter["$and"] = attr_conditions

        # Perform Search Query
        cursor = products_collection.find(mongo_filter)
        if sort_criteria:
            cursor = cursor.sort(sort_criteria)
        else:
            cursor = cursor.sort("rating", -1)

        raw_results = list(cursor)
        is_fallback = False

        # If zero results, execute relaxed fallback
        if not raw_results:
            is_fallback = True
            fallback_filter = {"is_active": True}
            or_clauses = []

            if entities.get("category"):
                or_clauses.append({"category": {"$regex": re.escape(entities["category"]), "$options": "i"}})
            if entities.get("brand"):
                or_clauses.append({"brand": {"$regex": re.escape(entities["brand"]), "$options": "i"}})
            if kw:
                or_clauses.append({"name": {"$regex": re.escape(kw), "$options": "i"}})
                or_clauses.append({"description": {"$regex": re.escape(kw), "$options": "i"}})

            for attr in entities.get("attributes", []):
                or_clauses.append({"description": {"$regex": re.escape(attr), "$options": "i"}})
                or_clauses.append({"attributes": {"$elemMatch": {"$regex": re.escape(attr), "$options": "i"}}})

            if or_clauses:
                fallback_filter["$or"] = or_clauses
                cursor = products_collection.find(fallback_filter).sort("rating", -1).limit(10)
                raw_results = list(cursor)

        # Format and serialize products
        serialized_products = []
        for doc in raw_results:
            serialized_products.append({
                "id": str(doc.get("_id")),
                "_id": str(doc.get("_id")),
                "name": doc.get("name", "Unknown Product"),
                "brand": doc.get("brand", "SmartRetail"),
                "price": float(doc.get("price", 0)),
                "stock": int(doc.get("stock_quantity", doc.get("stock", 0))),
                "stock_quantity": int(doc.get("stock_quantity", doc.get("stock", 0))),
                "category": doc.get("category", "General"),
                "description": doc.get("description", ""),
                "image": doc.get("image_url", doc.get("image", "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60")),
                "rating": float(doc.get("rating", 4.5)),
                "reviews_count": int(doc.get("reviews_count", 0)),
                "barcode": doc.get("barcode", ""),
                "location": doc.get("location", ""),
                "ingredients": doc.get("ingredients", []),
                "nutritional_info": doc.get("nutritional_info", {}),
                "discount": float(doc.get("discount", 0)),
                "is_loose_item": bool(doc.get("is_loose_item", False)),
                "price_per_unit": float(doc.get("price_per_unit", doc.get("price", 0))),
                "unit_type": doc.get("unit_type", "unit")
            })

        # Focused Product (for GET_PRODUCT_INFO, GET_PRODUCT_PRICE, FIND_CHEAPEST)
        focused_product = None
        if serialized_products and intent in ["GET_PRODUCT_INFO", "GET_PRODUCT_PRICE", "GET_PRODUCT_AVAILABILITY", "FIND_CHEAPEST"]:
            focused_product = serialized_products[0]

        # Generate Human-Friendly Summary
        summary = cls.generate_summary(intent, entities, len(serialized_products), is_fallback, focused_product)

        return {
            "success": True,
            "query": raw_query,
            "intent": intent,
            "entities": entities,
            "summary": summary,
            "count": len(serialized_products),
            "isFallback": is_fallback,
            "focusedProduct": focused_product,
            "products": serialized_products
        }

    @staticmethod
    def generate_summary(intent: str, entities: dict, count: int, is_fallback: bool, focused_product: dict = None) -> str:
        """Create conversational summary of search understanding and results"""
        if count == 0:
            return "We couldn't find any products matching your query. Try searching with a different price or keyword."

        if intent == "GET_PRODUCT_INFO" and focused_product:
            return f"Here is complete information for '{focused_product['name']}' ({focused_product.get('brand')})."

        if intent == "GET_PRODUCT_PRICE" and focused_product:
            return f"'{focused_product['name']}' is priced at ₹{focused_product['price']:.2f}."

        if intent == "GET_PRODUCT_AVAILABILITY" and focused_product:
            stock = focused_product.get("stock", 0)
            status = "In Stock" if stock > 0 else "Out of Stock"
            return f"'{focused_product['name']}' is currently {status} ({stock} units available)."

        if intent == "FIND_CHEAPEST" and focused_product:
            return f"The most affordable option is '{focused_product['name']}' at ₹{focused_product['price']:.2f}."

        parts = []
        if entities.get("category"):
            parts.append(f"in category '{entities['category']}'")
        if entities.get("brand"):
            parts.append(f"from brand '{entities['brand']}'")
        if entities.get("maxPrice") is not None and entities.get("minPrice") is not None:
            parts.append(f"priced between ₹{entities['minPrice']} and ₹{entities['maxPrice']}")
        elif entities.get("maxPrice") is not None:
            parts.append(f"under ₹{entities['maxPrice']}")
        elif entities.get("minPrice") is not None:
            parts.append(f"above ₹{entities['minPrice']}")
        if entities.get("attributes"):
            parts.append(f"with {', '.join(entities['attributes'])}")

        criteria = " ".join(parts) if parts else "matching your query"

        if is_fallback:
            return f"No exact matches for all strict criteria. Showing {count} related products {criteria}."

        return f"Found {count} product{'s' if count != 1 else ''} {criteria}."


def get_preset_suggestions():
    """Returns practical suggested queries to inspire the user in the search bar"""
    return [
        {"query": "Show me biscuits under ₹50", "category": "Price & Category"},
        {"query": "I want low sugar drinks", "category": "Health & Attributes"},
        {"query": "Show me products from Britannia", "category": "Brand Search"},
        {"query": "Which rice is cheapest?", "category": "Price Discovery"},
        {"query": "Show me dairy products", "category": "Category"},
        {"query": "I need a shampoo for dry hair", "category": "Attribute Matching"},
        {"query": "What is the price of Maggi?", "category": "Price Inquiry"},
        {"query": "Tell me about Maggi", "category": "Product Details"},
        {"query": "Show me products below ₹100", "category": "Price Filter"},
        {"query": "I want something to drink under ₹30", "category": "Budget Beverage"},
    ]
