"""
Smart Retail Navigation System - Physical Store Layout Module (layout.py)
Defines floors, rows, columns, coordinates, landmarks, and category-to-shelf mappings.
Graph scale: V = 85 nodes (72 shelves + 8 junctions + 3 stairs + 2 landmarks), E = 88 edges.
"""

ENTRANCE = "ENTRANCE"
BILLING = "BILLING"
FLOOR_CHANGE_PENALTY = 35

COLS = list(range(1, 10))  # Columns 1..9 (9 shelves per row * 8 rows = 72 shelves)

FLOORS = [
    {
        "id": "ground",
        "name": "Ground Floor",
        "level": 0,
        "rows": ["A", "B", "C", "D"],
        "categories": {
            "A": "Grains, Rice & Pulses",
            "B": "Dairy, Milk, Curd & Ghee",
            "C": "Spices, Masalas & Cooking Oils",
            "D": "Fresh Produce, Vegetables & Fruits",
        },
    },
    {
        "id": "first",
        "name": "First Floor",
        "level": 1,
        "rows": ["E", "F"],
        "categories": {
            "E": "Snacks, Biscuits, Noodles & Pasta",
            "F": "Beverages, Tea, Coffee & Juices",
        },
    },
    {
        "id": "second",
        "name": "Second Floor",
        "level": 2,
        "rows": ["G", "H"],
        "categories": {
            "G": "Bakery, Breads, Cakes & Desserts",
            "H": "Personal Care, Household & Essentials",
        },
    },
]

# Category / keyword mapping to deterministic shelf rows & columns
CATEGORY_TO_ROW = {
    "grains": "A",
    "rice": "A",
    "pulses": "A",
    "flour": "A",
    "atta": "A",
    "dairy": "B",
    "milk": "B",
    "curd": "B",
    "paneer": "B",
    "butter": "B",
    "cheese": "B",
    "ghee": "B",
    "spices": "C",
    "masala": "C",
    "oil": "C",
    "condiments": "C",
    "grocery": "C",
    "vegetables": "D",
    "fruits": "D",
    "produce": "D",
    "fresh": "D",
    "snacks": "E",
    "biscuits": "E",
    "noodles": "E",
    "pasta": "E",
    "chips": "E",
    "beverages": "F",
    "drinks": "F",
    "tea": "F",
    "coffee": "F",
    "juice": "F",
    "bakery": "G",
    "bread": "G",
    "desserts": "G",
    "sweets": "G",
    "chocolate": "G",
    "personal care": "H",
    "household": "H",
    "cleaning": "H",
    "general": "H",
}


def col_x(col: int) -> int:
    """Horizontal distance in metres from the row's junction to shelf column (1..9)."""
    return 8 + (int(col) - 1) * 5


def row_y(row_idx: int) -> int:
    """Vertical coordinate in metres for a row index within a floor."""
    return 20 + int(row_idx) * 18


def get_all_nodes_metadata() -> dict:
    """Return coordinate, floor, and type metadata for all 85 graph nodes."""
    nodes = {}

    for floor_idx, floor in enumerate(FLOORS):
        floor_id = floor["id"]
        floor_name = floor["name"]
        rows = floor["rows"]

        for row_idx, row in enumerate(rows):
            y = row_y(row_idx)
            j_id = f"J:{row}"
            nodes[j_id] = {
                "id": j_id,
                "label": f"Junction {row}",
                "type": "junction",
                "floor": floor_id,
                "floor_name": floor_name,
                "floor_level": floor_idx,
                "row": row,
                "x": 20,
                "y": y,
            }

            for col in COLS:
                s_id = f"{row}{col}"
                nodes[s_id] = {
                    "id": s_id,
                    "label": f"Shelf {s_id}",
                    "type": "shelf",
                    "floor": floor_id,
                    "floor_name": floor_name,
                    "floor_level": floor_idx,
                    "row": row,
                    "col": col,
                    "category": floor["categories"].get(row, "General"),
                    "x": 20 + col_x(col),
                    "y": y,
                }

        st_id = f"ST:{floor_id}"
        nodes[st_id] = {
            "id": st_id,
            "label": f"Stairs ({floor_name})",
            "type": "stairs",
            "floor": floor_id,
            "floor_name": floor_name,
            "floor_level": floor_idx,
            "x": 10,
            "y": (row_y(0) + row_y(len(rows) - 1)) // 2,
        }

    # Landmarks on Ground Floor
    nodes[ENTRANCE] = {
        "id": ENTRANCE,
        "label": "Store Entrance",
        "type": "landmark",
        "floor": "ground",
        "floor_name": "Ground Floor",
        "floor_level": 0,
        "x": 20,
        "y": 4,
    }
    nodes[BILLING] = {
        "id": BILLING,
        "label": "Billing Counter",
        "type": "landmark",
        "floor": "ground",
        "floor_name": "Ground Floor",
        "floor_level": 0,
        "x": 20,
        "y": row_y(len(FLOORS[0]["rows"]) - 1) + 16,
    }

    return nodes


def resolve_product_shelf(product: dict) -> str:
    """
    Resolve a product dictionary (with name, category, location, or id)
    to a valid shelf node ID (e.g. 'A3', 'B4', 'E2', 'G6').
    """
    import re

    # 1. Explicit shelf code in location if already like A1..H9
    loc = str(product.get("location") or product.get("shelf") or "").upper()
    match = re.search(r"\b([A-H])([1-9])\b", loc)
    if match:
        return f"{match.group(1)}{match.group(2)}"

    # 2. Match by product name or category keywords
    name = str(product.get("name") or "").lower()
    cat = str(product.get("category") or "").lower()
    combined = f"{name} {cat}"

    chosen_row = None
    for kw, row in CATEGORY_TO_ROW.items():
        if kw in combined:
            chosen_row = row
            break

    if not chosen_row:
        # Fallback deterministic row A..H
        rows_all = ["A", "B", "C", "D", "E", "F", "G", "H"]
        seed = sum(ord(c) for c in (name or "item"))
        chosen_row = rows_all[seed % len(rows_all)]

    # Deterministic column 1..9 from product name/id hash
    ident = str(product.get("name") or product.get("product_id") or product.get("id") or "1")
    col_num = (sum(ord(c) * (idx + 1) for idx, c in enumerate(ident)) % 9) + 1
    return f"{chosen_row}{col_num}"
