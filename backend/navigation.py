"""
Smart Retail Navigation System - Graph & Routing Module (navigation.py)
Builds the weighted multi-floor corridor graph from layout.py and answers routing queries:
- Point-to-point shortest path (Dijkstra with early termination + bilateral _DIST_CACHE memoisation)
- Multi-item route ordering (Nearest-Neighbour + 2-opt refinement with 60-pass guard)
- Full shopping cart route construction with step-by-step instructions & distance heatmaps.
"""

import heapq
from layout import (
    FLOORS,
    COLS,
    ENTRANCE,
    BILLING,
    FLOOR_CHANGE_PENALTY,
    col_x,
    row_y,
    get_all_nodes_metadata,
    resolve_product_shelf,
)


def _junction(row: str) -> str:
    return f"J:{row}"


def _stairs(floor_id: str) -> str:
    return f"ST:{floor_id}"


def _build_graph() -> dict:
    """
    Construct the undirected weighted corridor graph across all floors.
    V = 85 nodes (72 shelves + 8 junctions + 3 stairs + 2 landmarks), E = 88 edges.
    """
    graph = {}

    def add_edge(a: str, b: str, w: float):
        graph.setdefault(a, []).append((b, w))
        graph.setdefault(b, []).append((a, w))

    for floor_idx, floor in enumerate(FLOORS):
        for row_idx, row in enumerate(floor["rows"]):
            junction = _junction(row)
            for col in COLS:
                add_edge(junction, f"{row}{col}", col_x(col))
            if row_idx > 0:
                add_edge(
                    _junction(floor["rows"][row_idx - 1]),
                    junction,
                    row_y(row_idx) - row_y(row_idx - 1),
                )
        stairs = _stairs(floor["id"])
        add_edge(stairs, _junction(floor["rows"][0]), 10)
        add_edge(stairs, _junction(floor["rows"][-1]), 10)
        if floor_idx > 0:
            add_edge(
                stairs,
                _stairs(FLOORS[floor_idx - 1]["id"]),
                FLOOR_CHANGE_PENALTY,
            )

    add_edge(ENTRANCE, _junction(FLOORS[0]["rows"][0]), 14)
    add_edge(BILLING, _junction(FLOORS[0]["rows"][-1]), 14)
    add_edge(ENTRANCE, BILLING, 90)
    return graph


GRAPH = _build_graph()
NODES_META = get_all_nodes_metadata()

# Memoisation cache for pairwise shortest paths: (a, b) -> (distance, path)
_DIST_CACHE = {}


def shortest_path(source: str, target: str):
    """
    Single-source Dijkstra run that terminates the moment the target is popped
    from the priority queue, memoised in both directions in _DIST_CACHE.
    """
    if source == target:
        return 0, [source]

    cached = _DIST_CACHE.get((source, target))
    if cached is not None:
        return cached

    dist = {source: 0}
    prev = {}
    visited = set()
    queue = [(0, source)]

    while queue:
        d, node = heapq.heappop(queue)
        if node in visited:
            continue
        visited.add(node)
        if node == target:
            break
        for neighbour, weight in GRAPH.get(node, []):
            if neighbour in visited:
                continue
            nd = d + weight
            if nd < dist.get(neighbour, float("inf")):
                dist[neighbour] = nd
                prev[neighbour] = node
                heapq.heappush(queue, (nd, neighbour))

    if target not in dist:
        return float("inf"), []

    path = [target]
    while path[-1] in prev:
        path.append(prev[path[-1]])

    forward_path = list(reversed(path))
    rounded_dist = round(dist[target])

    # Memoise in both directions (a -> b and b -> a)
    _DIST_CACHE[(source, target)] = (rounded_dist, forward_path)
    _DIST_CACHE[(target, source)] = (rounded_dist, list(reversed(forward_path)))

    return rounded_dist, forward_path


def distance_between(a: str, b: str) -> float:
    """Return shortest-path walking distance in metres between node a and node b."""
    dist, _ = shortest_path(a, b)
    return dist


def _tour_length(order: list, start: str = ENTRANCE, end: str = BILLING) -> float:
    """Compute total tour distance: start -> order[0] -> ... -> order[-1] -> end."""
    if not order:
        return distance_between(start, end)
    total = distance_between(start, order[0])
    for idx in range(len(order) - 1):
        total += distance_between(order[idx], order[idx + 1])
    total += distance_between(order[-1], end)
    return total


def optimise_order(stops: list, start: str = ENTRANCE, end: str = BILLING) -> list:
    """
    Multi-item route ordering:
    1. Build an initial tour greedily (Nearest-Neighbour).
    2. Refine with 2-opt segment reversals (capped at guard < 60 passes).
    """
    remaining = [s for s in dict.fromkeys(stops) if s in GRAPH and s not in (start, end)]
    if not remaining:
        return []

    order = []
    cur = start
    while remaining:
        nxt = min(remaining, key=lambda s: distance_between(cur, s))
        remaining.remove(nxt)
        order.append(nxt)
        cur = nxt

    improved, guard = True, 0
    while improved and guard < 60:
        guard += 1
        improved = False
        best = _tour_length(order, start, end)
        for i in range(len(order) - 1):
            for k in range(i + 1, len(order)):
                candidate = order[:i] + list(reversed(order[i : k + 1])) + order[k + 1 :]
                length = _tour_length(candidate, start, end)
                if length + 0.01 < best:
                    order, best, improved = candidate, length, True

    return order


def get_entrance_heatmap() -> dict:
    """Compute Dijkstra distance from ENTRANCE to all 72 shelves for heatmap diagnostics."""
    heatmap = {}
    for floor in FLOORS:
        for row in floor["rows"]:
            for col in COLS:
                shelf_id = f"{row}{col}"
                heatmap[shelf_id] = distance_between(ENTRANCE, shelf_id)
    return heatmap


def build_route(cart_items: list, start: str = ENTRANCE, end: str = BILLING) -> dict:
    """
    Construct a complete, optimized in-store navigation route for a list of cart items
    or target shelves.
    """
    shelf_to_items = {}
    raw_stops = []

    for item in cart_items or []:
        if isinstance(item, str):
            shelf_id = item.strip().upper()
            if shelf_id not in GRAPH:
                shelf_id = resolve_product_shelf({"name": item})
            prod_info = {"name": item, "shelf": shelf_id, "quantity": 1}
        elif isinstance(item, dict):
            shelf_id = item.get("shelf")
            if not shelf_id or shelf_id not in GRAPH:
                shelf_id = resolve_product_shelf(item)
            prod_info = {
                "product_id": item.get("product_id") or item.get("id") or item.get("_id") or "",
                "name": item.get("name") or "Product",
                "category": item.get("category") or "",
                "quantity": item.get("quantity") or 1,
                "price": item.get("price") or 0,
                "image": item.get("image") or item.get("imageUrl") or item.get("image_url") or "",
                "shelf": shelf_id,
            }
        else:
            continue

        if shelf_id not in shelf_to_items:
            shelf_to_items[shelf_id] = []
            raw_stops.append(shelf_id)
        shelf_to_items[shelf_id].append(prod_info)

    unoptimised_dist = _tour_length(raw_stops, start, end)
    ordered_shelves = optimise_order(raw_stops, start, end)
    optimised_dist = _tour_length(ordered_shelves, start, end)

    waypoints = [start] + ordered_shelves + [end]
    segments = []
    full_node_sequence = []

    for idx in range(len(waypoints) - 1):
        u = waypoints[idx]
        v = waypoints[idx + 1]
        leg_dist, leg_path = shortest_path(u, v)

        if not full_node_sequence:
            full_node_sequence.extend(leg_path)
        else:
            full_node_sequence.extend(leg_path[1:])

        u_meta = NODES_META.get(u, {"label": u, "floor_name": "Ground Floor", "floor": "ground"})
        v_meta = NODES_META.get(v, {"label": v, "floor_name": "Ground Floor", "floor": "ground"})

        floor_change = u_meta.get("floor") != v_meta.get("floor")
        if v == BILLING:
            instruction = f"Proceed from {u_meta.get('label', u)} to {v_meta.get('label', v)} ({leg_dist}m) for checkout."
        elif floor_change:
            instruction = (
                f"Take stairs from {u_meta.get('floor_name')} to {v_meta.get('floor_name')} "
                f"and walk to {v_meta.get('label', v)} ({v_meta.get('category', '')}) [{leg_dist}m]."
            )
        else:
            instruction = (
                f"Walk from {u_meta.get('label', u)} via Junction {v_meta.get('row', '')} "
                f"to {v_meta.get('label', v)} ({v_meta.get('category', '')}) [{leg_dist}m]."
            )

        segments.append(
            {
                "step": idx + 1,
                "from": u,
                "from_label": u_meta.get("label", u),
                "from_floor": u_meta.get("floor", "ground"),
                "to": v,
                "to_label": v_meta.get("label", v),
                "to_floor": v_meta.get("floor", "ground"),
                "to_floor_name": v_meta.get("floor_name", "Ground Floor"),
                "category": v_meta.get("category", ""),
                "distance_m": leg_dist,
                "path": leg_path,
                "floor_change": floor_change,
                "instruction": instruction,
                "items": shelf_to_items.get(v, []),
            }
        )

    ordered_stops_details = []
    for order_idx, shelf_id in enumerate(ordered_shelves):
        meta = NODES_META.get(shelf_id, {})
        ordered_stops_details.append(
            {
                "stop_number": order_idx + 1,
                "shelf": shelf_id,
                "label": meta.get("label", f"Shelf {shelf_id}"),
                "floor": meta.get("floor", "ground"),
                "floor_name": meta.get("floor_name", "Ground Floor"),
                "row": meta.get("row", shelf_id[0]),
                "col": meta.get("col", int(shelf_id[1:]) if shelf_id[1:].isdigit() else 1),
                "category": meta.get("category", "General"),
                "x": meta.get("x", 0),
                "y": meta.get("y", 0),
                "distance_from_entrance_m": distance_between(ENTRANCE, shelf_id),
                "items": shelf_to_items.get(shelf_id, []),
            }
        )

    total_edges = sum(len(adj) for adj in GRAPH.values()) // 2
    saved_m = max(0, round(unoptimised_dist - optimised_dist))
    walking_time_sec = max(15, round(optimised_dist / 1.25))  # ~1.25 m/s indoor walking speed

    return {
        "success": True,
        "algorithm": "Dijkstra + Nearest-Neighbour + 2-Opt",
        "start": start,
        "end": end,
        "total_distance_m": round(optimised_dist),
        "unoptimised_distance_m": round(unoptimised_dist),
        "distance_saved_m": saved_m,
        "estimated_time_sec": walking_time_sec,
        "estimated_time_min": round(walking_time_sec / 60, 1),
        "stops_count": len(ordered_shelves),
        "ordered_stops": ordered_stops_details,
        "segments": segments,
        "full_path": full_node_sequence,
        "graph_stats": {
            "nodes_V": len(GRAPH),
            "edges_E": total_edges,
            "cache_entries": len(_DIST_CACHE),
            "two_opt_guard_cap": 60,
        },
    }


def get_layout_data() -> dict:
    """Return full store layout, graph edges, node coordinates, and entrance distance heatmap."""
    edges_list = []
    seen = set()
    for u, neighbours in GRAPH.items():
        for v, w in neighbours:
            pair = tuple(sorted((u, v)))
            if pair not in seen:
                seen.add(pair)
                edges_list.append({"from": u, "to": v, "weight": w})

    return {
        "success": True,
        "floors": FLOORS,
        "cols": COLS,
        "entrance": ENTRANCE,
        "billing": BILLING,
        "floor_change_penalty": FLOOR_CHANGE_PENALTY,
        "nodes": NODES_META,
        "edges": edges_list,
        "heatmap": get_entrance_heatmap(),
        "stats": {
            "nodes_V": len(GRAPH),
            "edges_E": len(edges_list),
        },
    }
