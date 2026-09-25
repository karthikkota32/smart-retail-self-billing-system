import React, { useState, useEffect, useMemo } from "react";

const ENTRANCE = "ENTRANCE";
const BILLING = "BILLING";
const FLOOR_CHANGE_PENALTY = 35;
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const FLOORS = [
  {
    id: "ground",
    name: "Ground Floor",
    rows: ["A", "B", "C", "D"],
    categories: {
      A: "Grains, Rice & Pulses",
      B: "Dairy, Milk, Curd & Ghee",
      C: "Spices, Masalas & Cooking Oils",
      D: "Fresh Produce, Vegetables & Fruits",
    },
  },
  {
    id: "first",
    name: "First Floor",
    rows: ["E", "F"],
    categories: {
      E: "Snacks, Biscuits, Noodles & Pasta",
      F: "Beverages, Tea, Coffee & Juices",
    },
  },
  {
    id: "second",
    name: "Second Floor",
    rows: ["G", "H"],
    categories: {
      G: "Bakery, Breads, Cakes & Desserts",
      H: "Personal Care, Household & Essentials",
    },
  },
];

const CATEGORY_TO_ROW = {
  grains: "A",
  rice: "A",
  pulses: "A",
  flour: "A",
  atta: "A",
  dairy: "B",
  milk: "B",
  curd: "B",
  paneer: "B",
  butter: "B",
  cheese: "B",
  ghee: "B",
  spices: "C",
  masala: "C",
  oil: "C",
  grocery: "C",
  vegetables: "D",
  fruits: "D",
  produce: "D",
  fresh: "D",
  snacks: "E",
  biscuits: "E",
  noodles: "E",
  pasta: "E",
  chips: "E",
  beverages: "F",
  drinks: "F",
  tea: "F",
  coffee: "F",
  juice: "F",
  bakery: "G",
  bread: "G",
  desserts: "G",
  chocolate: "G",
  "personal care": "H",
  household: "H",
  general: "H",
};

const colX = (col) => 8 + (col - 1) * 5;
const rowY = (rowIdx) => 20 + rowIdx * 18;

// Build corridor graph (V = 85 nodes, E = 88 edges)
function buildCorridorGraph() {
  const graph = {};
  const nodesMeta = {};

  const addEdge = (a, b, w) => {
    if (!graph[a]) graph[a] = [];
    if (!graph[b]) graph[b] = [];
    graph[a].push({ node: b, weight: w });
    graph[b].push({ node: a, weight: w });
  };

  FLOORS.forEach((floor, floorIdx) => {
    floor.rows.forEach((row, rowIdx) => {
      const junction = `J:${row}`;
      const y = rowY(rowIdx);
      nodesMeta[junction] = {
        id: junction,
        label: `Junction ${row}`,
        type: "junction",
        floor: floor.id,
        floorName: floor.name,
        row,
        x: 65,
        y: 50 + rowIdx * 56,
      };

      COLS.forEach((col) => {
        const shelfId = `${row}${col}`;
        addEdge(junction, shelfId, colX(col));
        nodesMeta[shelfId] = {
          id: shelfId,
          label: `Shelf ${shelfId}`,
          type: "shelf",
          floor: floor.id,
          floorName: floor.name,
          row,
          col,
          category: floor.categories[row],
          x: 115 + (col - 1) * 34,
          y: 50 + rowIdx * 56,
        };
      });

      if (rowIdx > 0) {
        addEdge(
          `J:${floor.rows[rowIdx - 1]}`,
          junction,
          rowY(rowIdx) - rowY(rowIdx - 1)
        );
      }
    });

    const stairs = `ST:${floor.id}`;
    const midY = 50 + ((floor.rows.length - 1) * 56) / 2;
    nodesMeta[stairs] = {
      id: stairs,
      label: `Stairs (${floor.name})`,
      type: "stairs",
      floor: floor.id,
      floorName: floor.name,
      x: 22,
      y: midY,
    };

    addEdge(stairs, `J:${floor.rows[0]}`, 10);
    addEdge(stairs, `J:${floor.rows[floor.rows.length - 1]}`, 10);

    if (floorIdx > 0) {
      addEdge(stairs, `ST:${FLOORS[floorIdx - 1].id}`, FLOOR_CHANGE_PENALTY);
    }
  });

  nodesMeta[ENTRANCE] = {
    id: ENTRANCE,
    label: "Entrance",
    type: "landmark",
    floor: "ground",
    floorName: "Ground Floor",
    x: 65,
    y: 14,
  };
  nodesMeta[BILLING] = {
    id: BILLING,
    label: "Billing Counter",
    type: "landmark",
    floor: "ground",
    floorName: "Ground Floor",
    x: 65,
    y: 50 + 3 * 56 + 36,
  };

  addEdge(ENTRANCE, `J:${FLOORS[0].rows[0]}`, 14);
  addEdge(BILLING, `J:${FLOORS[0].rows[FLOORS[0].rows.length - 1]}`, 14);
  addEdge(ENTRANCE, BILLING, 90);

  return { graph, nodesMeta };
}

const { graph: GRAPH, nodesMeta: NODES_META } = buildCorridorGraph();
const DIST_CACHE = new Map();

// Single-source Dijkstra with early termination & bilateral memoisation
export function shortestPathDijkstra(source, target) {
  if (source === target) return { distance: 0, path: [source] };
  const cacheKey = `${source}->${target}`;
  if (DIST_CACHE.has(cacheKey)) return DIST_CACHE.get(cacheKey);

  const dist = { [source]: 0 };
  const prev = {};
  const visited = new Set();
  const pq = [{ d: 0, node: source }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { d, node } = pq.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    if (node === target) break;

    for (const { node: neighbour, weight } of GRAPH[node] || []) {
      if (visited.has(neighbour)) continue;
      const nd = d + weight;
      if (nd < (dist[neighbour] ?? Infinity)) {
        dist[neighbour] = nd;
        prev[neighbour] = node;
        pq.push({ d: nd, node: neighbour });
      }
    }
  }

  if (dist[target] === undefined) return { distance: Infinity, path: [] };

  const path = [target];
  while (prev[path[path.length - 1]]) {
    path.push(prev[path[path.length - 1]]);
  }
  path.reverse();

  const res = { distance: Math.round(dist[target]), path };
  DIST_CACHE.set(`${source}->${target}`, res);
  DIST_CACHE.set(`${target}->${source}`, {
    distance: res.distance,
    path: [...path].reverse(),
  });
  return res;
}

const distanceBetween = (a, b) => shortestPathDijkstra(a, b).distance;

const tourLength = (order, start = ENTRANCE, end = BILLING) => {
  if (!order.length) return distanceBetween(start, end);
  let total = distanceBetween(start, order[0]);
  for (let i = 0; i < order.length - 1; i++) {
    total += distanceBetween(order[i], order[i + 1]);
  }
  total += distanceBetween(order[order.length - 1], end);
  return total;
};

// Nearest-Neighbour + 2-opt refinement (capped at guard < 60)
export function optimiseOrderDijkstra(stops, start = ENTRANCE, end = BILLING) {
  const remaining = [...new Set(stops)].filter(
    (s) => GRAPH[s] && s !== start && s !== end
  );
  if (!remaining.length) return [];

  const order = [];
  let cur = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = distanceBetween(cur, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = distanceBetween(cur, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const nxt = remaining.splice(bestIdx, 1)[0];
    order.push(nxt);
    cur = nxt;
  }

  let improved = true;
  let guard = 0;
  while (improved && guard < 60) {
    guard += 1;
    improved = false;
    let best = tourLength(order, start, end);
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, k + 1).reverse(),
          ...order.slice(k + 1),
        ];
        const len = tourLength(candidate, start, end);
        if (len + 0.01 < best) {
          order.splice(0, order.length, ...candidate);
          best = len;
          improved = true;
        }
      }
    }
  }

  return order;
}

export function resolveShelfForItem(item) {
  const loc = String(item?.location || item?.shelf || "").toUpperCase();
  const match = loc.match(/\b([A-H])([1-9])\b/);
  if (match) return `${match[1]}${match[2]}`;

  const text = `${item?.name || ""} ${item?.category || ""}`.toLowerCase();
  let chosenRow = null;
  for (const [kw, row] of Object.entries(CATEGORY_TO_ROW)) {
    if (text.includes(kw)) {
      chosenRow = row;
      break;
    }
  }
  if (!chosenRow) {
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const sum = [...(item?.name || "item")].reduce((s, c) => s + c.charCodeAt(0), 0);
    chosenRow = rows[sum % rows.length];
  }
  const ident = String(item?.name || item?.id || "1");
  const col =
    ([...ident].reduce((s, c, idx) => s + c.charCodeAt(0) * (idx + 1), 0) % 9) + 1;
  return `${chosenRow}${col}`;
}

export default function StoreDijkstraNavigator({ cartItems = [], initialTargetShelf = null }) {
  const [mode, setMode] = useState(cartItems.length > 0 ? "cart" : "single");
  const [selectedShelf, setSelectedShelf] = useState(initialTargetShelf || "A4");
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (initialTargetShelf) {
      setSelectedShelf(initialTargetShelf);
      setMode("single");
    }
  }, [initialTargetShelf]);

  const routeData = useMemo(() => {
    let rawShelves = [];
    const shelfItemsMap = {};

    if (mode === "cart" && cartItems.length > 0) {
      cartItems.forEach((item) => {
        const s = resolveShelfForItem(item);
        if (!shelfItemsMap[s]) {
          shelfItemsMap[s] = [];
          rawShelves.push(s);
        }
        shelfItemsMap[s].push(item);
      });
    } else {
      rawShelves = [selectedShelf];
      shelfItemsMap[selectedShelf] = [
        { name: `Target Shelf ${selectedShelf} (${NODES_META[selectedShelf]?.category || "Store Item"})` },
      ];
    }

    const unoptimisedDist = tourLength(rawShelves, ENTRANCE, BILLING);
    const orderedStops = optimiseOrderDijkstra(rawShelves, ENTRANCE, BILLING);
    const optimisedDist = tourLength(orderedStops, ENTRANCE, BILLING);

    const waypoints = [ENTRANCE, ...orderedStops, BILLING];
    const segments = [];
    const activeEdges = new Set();
    const activeNodes = new Set();

    for (let i = 0; i < waypoints.length - 1; i++) {
      const u = waypoints[i];
      const v = waypoints[i + 1];
      const { distance, path } = shortestPathDijkstra(u, v);
      path.forEach((n) => activeNodes.add(n));
      for (let j = 0; j < path.length - 1; j++) {
        const a = path[j];
        const b = path[j + 1];
        activeEdges.add([a, b].sort().join("--"));
      }
      segments.push({
        step: i + 1,
        from: u,
        to: v,
        fromMeta: NODES_META[u],
        toMeta: NODES_META[v],
        distance,
        path,
        items: shelfItemsMap[v] || [],
      });
    }

    return {
      orderedStops,
      shelfItemsMap,
      optimisedDist,
      unoptimisedDist,
      savedDist: Math.max(0, unoptimisedDist - optimisedDist),
      segments,
      activeEdges,
      activeNodes,
    };
  }, [mode, cartItems, selectedShelf]);

  const getShelfHeatmapColor = (shelfId) => {
    const d = distanceBetween(ENTRANCE, shelfId);
    // Range ~22m to ~165m
    const ratio = Math.min(1, Math.max(0, (d - 20) / 145));
    const r = Math.round(254 - ratio * 70);
    const g = Math.round(240 - ratio * 200);
    const b = Math.round(138 - ratio * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #4f46e5)",
                color: "white",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              🧭 Graph Routing (V=85, E=88)
            </span>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              Smart In-Store Navigation (Dijkstra + 2-Opt)
            </h3>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
            Shortest-path corridor routing across Ground, First, and Second floors with Nearest-Neighbour + 2-Opt tour optimization
          </p>
        </div>

        {/* Mode Controls */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setMode("cart")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: mode === "cart" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
              background: mode === "cart" ? "#eef2ff" : "white",
              color: mode === "cart" ? "#4338ca" : "#334155",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🛒 Optimize Cart Route ({cartItems.length} items)
          </button>
          <button
            type="button"
            onClick={() => setMode("single")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: mode === "single" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
              background: mode === "single" ? "#eef2ff" : "white",
              color: mode === "single" ? "#4338ca" : "#334155",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            📍 Point-to-Point Shelf Lookup
          </button>
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: showHeatmap ? "2px solid #ea580c" : "1px solid #cbd5e1",
              background: showHeatmap ? "#fff7ed" : "white",
              color: showHeatmap ? "#c2410c" : "#334155",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🔥 {showHeatmap ? "Hide Heatmap" : "Distance Heatmap"}
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Dijkstra Shortest Distance</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#4f46e5" }}>{routeData.optimisedDist} m</div>
        </div>
        <div style={{ background: "#f0fdf4", padding: "12px 16px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>2-Opt Distance Saved</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#15803d" }}>
            {routeData.savedDist} m saved
          </div>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Required Shelf Stops</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
            {routeData.orderedStops.length} shelves
          </div>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Est. Walking Time</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
            {Math.max(1, Math.round(routeData.optimisedDist / 75))} min ({Math.round(routeData.optimisedDist / 1.25)}s)
          </div>
        </div>
      </div>

      {mode === "single" && (
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
            Click any shelf on the map below or select target shelf:
          </span>
          <select
            value={selectedShelf}
            onChange={(e) => setSelectedShelf(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            {FLOORS.map((f) =>
              f.rows.map((r) =>
                COLS.map((c) => {
                  const sid = `${r}${c}`;
                  return (
                    <option key={sid} value={sid}>
                      {sid} — {f.name} ({f.categories[r]}) [{distanceBetween(ENTRANCE, sid)}m from Entrance]
                    </option>
                  );
                })
              )
            )}
          </select>
        </div>
      )}

      {/* 3-Floor Visual Corridor Graph (Matches Figure 1 & Figure 2 of PDF) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {FLOORS.map((floor) => {
          const stNode = NODES_META[`ST:${floor.id}`];
          const isStairsActive = routeData.activeNodes.has(`ST:${floor.id}`);

          return (
            <div
              key={floor.id}
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b" }}>{floor.name}</span>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                  Rows {floor.rows.join(", ")}
                </span>
              </div>

              <svg viewBox="0 0 430 275" style={{ width: "100%", height: "auto", background: "white", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                {/* Stairs links */}
                {floor.rows.length > 0 && (
                  <>
                    <line
                      x1={stNode.x}
                      y1={stNode.y}
                      x2={NODES_META[`J:${floor.rows[0]}`].x}
                      y2={NODES_META[`J:${floor.rows[0]}`].y}
                      stroke={
                        routeData.activeEdges.has([`ST:${floor.id}`, `J:${floor.rows[0]}`].sort().join("--"))
                          ? "#10b981"
                          : "#cbd5e1"
                      }
                      strokeWidth={
                        routeData.activeEdges.has([`ST:${floor.id}`, `J:${floor.rows[0]}`].sort().join("--"))
                          ? 3.5
                          : 1.5
                      }
                    />
                    <line
                      x1={stNode.x}
                      y1={stNode.y}
                      x2={NODES_META[`J:${floor.rows[floor.rows.length - 1]}`].x}
                      y2={NODES_META[`J:${floor.rows[floor.rows.length - 1]}`].y}
                      stroke={
                        routeData.activeEdges.has(
                          [`ST:${floor.id}`, `J:${floor.rows[floor.rows.length - 1]}`].sort().join("--")
                        )
                          ? "#10b981"
                          : "#cbd5e1"
                      }
                      strokeWidth={
                        routeData.activeEdges.has(
                          [`ST:${floor.id}`, `J:${floor.rows[floor.rows.length - 1]}`].sort().join("--")
                        )
                          ? 3.5
                          : 1.5
                      }
                    />
                  </>
                )}

                {/* Junction chain on this floor */}
                {floor.rows.map((row, rIdx) => {
                  const jNode = NODES_META[`J:${row}`];
                  const nextRow = floor.rows[rIdx + 1];
                  const nextJ = nextRow ? NODES_META[`J:${nextRow}`] : null;
                  const edgeKey = nextRow ? [`J:${row}`, `J:${nextRow}`].sort().join("--") : null;
                  const edgeActive = edgeKey && routeData.activeEdges.has(edgeKey);

                  return (
                    <g key={`row_${row}`}>
                      {nextJ && (
                        <line
                          x1={jNode.x}
                          y1={jNode.y}
                          x2={nextJ.x}
                          y2={nextJ.y}
                          stroke={edgeActive ? "#10b981" : "#60a5fa"}
                          strokeWidth={edgeActive ? 4 : 2.5}
                        />
                      )}

                      {/* Horizontal aisle line to last shelf */}
                      <line
                        x1={jNode.x}
                        y1={jNode.y}
                        x2={NODES_META[`${row}9`].x}
                        y2={jNode.y}
                        stroke="#e2e8f0"
                        strokeWidth={2}
                      />

                      {/* Highlighted path along row if any shelf in this row is visited */}
                      {COLS.map((c) => {
                        const sid = `${row}${c}`;
                        const sEdge = [`J:${row}`, sid].sort().join("--");
                        if (!routeData.activeEdges.has(sEdge)) return null;
                        return (
                          <line
                            key={`active_${sid}`}
                            x1={jNode.x}
                            y1={jNode.y}
                            x2={NODES_META[sid].x}
                            y2={NODES_META[sid].y}
                            stroke="#10b981"
                            strokeWidth={3.5}
                          />
                        );
                      })}

                      {/* Category label */}
                      <text x={115} y={jNode.y - 14} fontSize="9" fill="#64748b" fontWeight="600">
                        Row {row}: {floor.categories[row]}
                      </text>

                      {/* Junction Diamond */}
                      <polygon
                        points={`${jNode.x},${jNode.y - 6} ${jNode.x + 6},${jNode.y} ${jNode.x},${jNode.y + 6} ${jNode.x - 6},${jNode.y}`}
                        fill={routeData.activeNodes.has(`J:${row}`) ? "#10b981" : "#3b82f6"}
                      />

                      {/* 9 Shelves per row */}
                      {COLS.map((c) => {
                        const sid = `${row}${c}`;
                        const sNode = NODES_META[sid];
                        const stopIndex = routeData.orderedStops.indexOf(sid);
                        const isTarget = stopIndex !== -1;

                        const fillColor = isTarget
                          ? "#10b981"
                          : showHeatmap
                          ? getShelfHeatmapColor(sid)
                          : "#f59e0b";

                        return (
                          <g
                            key={sid}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setSelectedShelf(sid);
                              setMode("single");
                            }}
                          >
                            <rect
                              x={sNode.x - 11}
                              y={sNode.y - 10}
                              width={22}
                              height={20}
                              rx={4}
                              fill={fillColor}
                              stroke={isTarget ? "#065f46" : "#fff"}
                              strokeWidth={isTarget ? 2 : 1}
                            />
                            <text
                              x={sNode.x}
                              y={sNode.y + 3}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="700"
                              fill={isTarget ? "#ffffff" : "#1e293b"}
                            >
                              {sid}
                            </text>
                            {isTarget && (
                              <circle
                                cx={sNode.x + 9}
                                cy={sNode.y - 9}
                                r={6}
                                fill="#ef4444"
                              />
                            )}
                            {isTarget && (
                              <text
                                x={sNode.x + 9}
                                y={sNode.y - 6.5}
                                textAnchor="middle"
                                fontSize="7"
                                fontWeight="800"
                                fill="#fff"
                              >
                                {stopIndex + 1}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Stairs Node */}
                <polygon
                  points={`${stNode.x},${stNode.y - 8} ${stNode.x + 7},${stNode.y + 6} ${stNode.x - 7},${stNode.y + 6}`}
                  fill={isStairsActive ? "#10b981" : "#ef4444"}
                />
                <text x={stNode.x} y={stNode.y + 17} textAnchor="middle" fontSize="8" fontWeight="700" fill="#b91c1c">
                  STAIRS
                </text>

                {/* Entrance & Billing on Ground Floor */}
                {floor.id === "ground" && (
                  <>
                    <line
                      x1={NODES_META[ENTRANCE].x}
                      y1={NODES_META[ENTRANCE].y}
                      x2={NODES_META["J:A"].x}
                      y2={NODES_META["J:A"].y}
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                    <circle cx={NODES_META[ENTRANCE].x} cy={NODES_META[ENTRANCE].y} r={6} fill="#16a34a" />
                    <text x={NODES_META[ENTRANCE].x + 12} y={NODES_META[ENTRANCE].y + 3} fontSize="9" fontWeight="800" fill="#15803d">
                      ★ ENTRANCE
                    </text>

                    <line
                      x1={NODES_META["J:D"].x}
                      y1={NODES_META["J:D"].y}
                      x2={NODES_META[BILLING].x}
                      y2={NODES_META[BILLING].y}
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                    <circle cx={NODES_META[BILLING].x} cy={NODES_META[BILLING].y} r={6} fill="#16a34a" />
                    <text x={NODES_META[BILLING].x + 12} y={NODES_META[BILLING].y + 3} fontSize="9" fontWeight="800" fill="#15803d">
                      ★ BILLING
                    </text>
                  </>
                )}
              </svg>
            </div>
          );
        })}
      </div>

      {/* Step-by-step Dijkstra Route Instructions */}
      <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
          📋 Optimal Step-by-Step Walking Sequence (Entrance → Shelves → Billing)
        </h4>
        <div style={{ display: "grid", gap: "8px" }}>
          {routeData.segments.map((seg) => (
            <div
              key={seg.step}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "white",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  {seg.step}
                </span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                    {seg.fromMeta?.label || seg.from} → {seg.toMeta?.label || seg.to}{" "}
                    <span style={{ color: "#64748b", fontWeight: 500 }}>
                      ({seg.toMeta?.floorName || "Ground Floor"})
                    </span>
                  </div>
                  {seg.items.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                      Pick up: {seg.items.map((i) => i.name).join(", ")}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    background: "#f1f5f9",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                  }}
                >
                  {seg.path.join(" → ")}
                </span>
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#166534",
                    fontWeight: 800,
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                  }}
                >
                  {seg.distance} m
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
