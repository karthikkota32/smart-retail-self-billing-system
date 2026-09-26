import React, { useState, useMemo } from "react";

const ENTRANCE = "ENTRANCE";
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
      nodesMeta[junction] = {
        id: junction,
        label: `Junction ${row}`,
        type: "junction",
        floor: floor.id,
        floorName: floor.name,
        row,
        x: 70,
        y: 52 + rowIdx * 54,
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
          x: 120 + (col - 1) * 34,
          y: 52 + rowIdx * 54,
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
    const midY = 52 + ((floor.rows.length - 1) * 54) / 2;
    nodesMeta[stairs] = {
      id: stairs,
      label: `Stairs (${floor.name})`,
      type: "stairs",
      floor: floor.id,
      floorName: floor.name,
      x: 24,
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
    label: "You (Store Entrance)",
    type: "landmark",
    floor: "ground",
    floorName: "Ground Floor",
    x: 70,
    y: 16,
  };

  addEdge(ENTRANCE, `J:${FLOORS[0].rows[0]}`, 14);

  return { graph, nodesMeta };
}

const { graph: GRAPH, nodesMeta: NODES_META } = buildCorridorGraph();
const DIST_CACHE = new Map();

// Single-source Dijkstra shortest path from user location (source) to target product shelf
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

export function resolveShelfForItem(item) {
  if (!item) return "A3";
  const loc =
    typeof item.location === "object" && item.location !== null
      ? `${item.location.aisle || ""}${item.location.shelf || ""}`
      : String(item.location || item.shelf || "");
  const match = loc.toUpperCase().match(/\b([A-H])([1-9])\b/);
  if (match) return `${match[1]}${match[2]}`;

  const text = `${item.name || ""} ${item.category || ""}`.toLowerCase();
  let chosenRow = null;
  for (const [kw, row] of Object.entries(CATEGORY_TO_ROW)) {
    if (text.includes(kw)) {
      chosenRow = row;
      break;
    }
  }
  if (!chosenRow) {
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const sum = [...(item.name || "item")].reduce((s, c) => s + c.charCodeAt(0), 0);
    chosenRow = rows[sum % rows.length];
  }
  const ident = String(item.name || item.id || "1");
  const col =
    ([...ident].reduce((s, c, idx) => s + c.charCodeAt(0) * (idx + 1), 0) % 9) + 1;
  return `${chosenRow}${col}`;
}

/**
 * StoreDijkstraNavigator
 * Displays the Dijkstra shortest-path map ONLY from the User's current position
 * to the selected product's shelf (only rendering the floor(s) involved in the path).
 */
export default function StoreDijkstraNavigator({ product }) {
  const targetShelf = useMemo(() => resolveShelfForItem(product), [product]);
  const [userPosition, setUserPosition] = useState(ENTRANCE);

  const routeInfo = useMemo(() => {
    const { distance, path } = shortestPathDijkstra(userPosition, targetShelf);
    const activeNodes = new Set(path);
    const activeEdges = new Set();
    const floorsVisited = new Set();

    for (let i = 0; i < path.length; i++) {
      const meta = NODES_META[path[i]];
      if (meta?.floor) floorsVisited.add(meta.floor);
      if (i < path.length - 1) {
        activeEdges.add([path[i], path[i + 1]].sort().join("--"));
      }
    }

    const targetMeta = NODES_META[targetShelf] || {};
    const startMeta = NODES_META[userPosition] || {};

    // Build human-readable turn-by-turn steps along the Dijkstra path
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const uMeta = NODES_META[u] || { label: u };
      const vMeta = NODES_META[v] || { label: v };
      const legDist = shortestPathDijkstra(u, v).distance;

      if (u.startsWith("ST:") && v.startsWith("ST:")) {
        steps.push(`Take stairs to ${vMeta.floorName} (${legDist}m)`);
      } else if (v === targetShelf) {
        steps.push(
          `Walk down Row ${vMeta.row} to Shelf ${targetShelf} (${product?.name || "Selected Product"}) [${legDist}m]`
        );
      } else {
        steps.push(`Proceed from ${uMeta.label} to ${vMeta.label} (${legDist}m)`);
      }
    }

    return {
      distance,
      path,
      activeNodes,
      activeEdges,
      floorsVisited,
      targetMeta,
      startMeta,
      steps,
      walkTimeSec: Math.max(8, Math.round(distance / 1.25)),
    };
  }, [userPosition, targetShelf, product]);

  // Only show the floor(s) along the path from User -> Selected Product
  const visibleFloors = useMemo(
    () => FLOORS.filter((f) => routeInfo.floorsVisited.has(f.id)),
    [routeInfo.floorsVisited]
  );

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "14px",
        padding: "20px",
        border: "2px solid #c7d2fe",
        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.08)",
        marginTop: "14px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <span
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              padding: "3px 10px",
              borderRadius: "14px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            🧭 Dijkstra Shortest Path (User → Product)
          </span>
          <h4 style={{ margin: "6px 0 2px 0", fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
            Route to {product?.name || `Shelf ${targetShelf}`}
          </h4>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            From <strong>{routeInfo.startMeta.label}</strong> to{" "}
            <strong>
              Shelf {targetShelf} ({routeInfo.targetMeta.floorName}, Row {routeInfo.targetMeta.row})
            </strong>
          </p>
        </div>

        {/* Starting location selector (defaults to Store Entrance) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            👤 Your Position:
          </label>
          <select
            value={userPosition}
            onChange={(e) => setUserPosition(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              fontWeight: 700,
              color: "#1e293b",
              background: "#f8fafc",
            }}
          >
            <option value={ENTRANCE}>🚪 Store Entrance (Default)</option>
            {FLOORS.map((f) =>
              f.rows.map((r) => (
                <option key={`J:${r}`} value={`J:${r}`}>
                  📍 Aisle Row {r} Junction ({f.name})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Quick Distance & Time Pills */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ background: "#f0fdf4", padding: "10px 12px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Shortest Distance</div>
          <div style={{ fontSize: "19px", fontWeight: 800, color: "#15803d" }}>{routeInfo.distance} metres</div>
        </div>
        <div style={{ background: "#eef2ff", padding: "10px 12px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
          <div style={{ fontSize: "11px", color: "#3730a3", fontWeight: 600 }}>Target Shelf</div>
          <div style={{ fontSize: "19px", fontWeight: 800, color: "#4338ca" }}>
            Shelf {targetShelf} ({routeInfo.targetMeta.floorName})
          </div>
        </div>
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Walking Time</div>
          <div style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>~{routeInfo.walkTimeSec} sec</div>
        </div>
      </div>

      {/* Visual Corridor Map ONLY for the floor(s) along the User -> Product path */}
      <div style={{ display: "grid", gap: "12px", marginBottom: "14px" }}>
        {visibleFloors.map((floor) => {
          const stNode = NODES_META[`ST:${floor.id}`];
          const isStairsActive = routeInfo.activeNodes.has(`ST:${floor.id}`);
          const svgHeight = floor.rows.length * 56 + 42;

          return (
            <div
              key={floor.id}
              style={{
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 800, fontSize: "13px", color: "#1e293b" }}>
                  🗺️ {floor.name}
                </span>
                <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                  🟢 Green Line = Dijkstra Shortest Path
                </span>
              </div>

              <svg
                viewBox={`0 0 430 ${svgHeight}`}
                style={{
                  width: "100%",
                  height: "auto",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Stairs links if stairs used */}
                {isStairsActive && (
                  <>
                    <line
                      x1={stNode.x}
                      y1={stNode.y}
                      x2={NODES_META[`J:${floor.rows[0]}`].x}
                      y2={NODES_META[`J:${floor.rows[0]}`].y}
                      stroke={
                        routeInfo.activeEdges.has([`ST:${floor.id}`, `J:${floor.rows[0]}`].sort().join("--"))
                          ? "#10b981"
                          : "#e2e8f0"
                      }
                      strokeWidth={
                        routeInfo.activeEdges.has([`ST:${floor.id}`, `J:${floor.rows[0]}`].sort().join("--"))
                          ? 4
                          : 1.5
                      }
                    />
                    <line
                      x1={stNode.x}
                      y1={stNode.y}
                      x2={NODES_META[`J:${floor.rows[floor.rows.length - 1]}`].x}
                      y2={NODES_META[`J:${floor.rows[floor.rows.length - 1]}`].y}
                      stroke={
                        routeInfo.activeEdges.has(
                          [`ST:${floor.id}`, `J:${floor.rows[floor.rows.length - 1]}`].sort().join("--")
                        )
                          ? "#10b981"
                          : "#e2e8f0"
                      }
                      strokeWidth={
                        routeInfo.activeEdges.has(
                          [`ST:${floor.id}`, `J:${floor.rows[floor.rows.length - 1]}`].sort().join("--")
                        )
                          ? 4
                          : 1.5
                      }
                    />
                    <polygon
                      points={`${stNode.x},${stNode.y - 8} ${stNode.x + 7},${stNode.y + 6} ${stNode.x - 7},${stNode.y + 6}`}
                      fill="#10b981"
                    />
                    <text x={stNode.x} y={stNode.y + 16} textAnchor="middle" fontSize="8" fontWeight="800" fill="#047857">
                      STAIRS
                    </text>
                  </>
                )}

                {/* Rows & Shelves on this floor */}
                {floor.rows.map((row, rIdx) => {
                  const jNode = NODES_META[`J:${row}`];
                  const nextRow = floor.rows[rIdx + 1];
                  const nextJ = nextRow ? NODES_META[`J:${nextRow}`] : null;
                  const edgeKey = nextRow ? [`J:${row}`, `J:${nextRow}`].sort().join("--") : null;
                  const edgeActive = edgeKey && routeInfo.activeEdges.has(edgeKey);

                  return (
                    <g key={`row_${row}`}>
                      {nextJ && (
                        <line
                          x1={jNode.x}
                          y1={jNode.y}
                          x2={nextJ.x}
                          y2={nextJ.y}
                          stroke={edgeActive ? "#10b981" : "#cbd5e1"}
                          strokeWidth={edgeActive ? 4.5 : 2}
                        />
                      )}

                      {/* Background aisle line */}
                      <line
                        x1={jNode.x}
                        y1={jNode.y}
                        x2={NODES_META[`${row}9`].x}
                        y2={jNode.y}
                        stroke="#f1f5f9"
                        strokeWidth={2}
                      />

                      {/* Highlighted green path from junction to target shelf */}
                      {COLS.map((c) => {
                        const sid = `${row}${c}`;
                        const sEdge = [`J:${row}`, sid].sort().join("--");
                        if (!routeInfo.activeEdges.has(sEdge)) return null;
                        return (
                          <line
                            key={`active_${sid}`}
                            x1={jNode.x}
                            y1={jNode.y}
                            x2={NODES_META[sid].x}
                            y2={NODES_META[sid].y}
                            stroke="#10b981"
                            strokeWidth={4.5}
                          />
                        );
                      })}

                      {/* Row label */}
                      <text x={120} y={jNode.y - 14} fontSize="8.5" fill="#64748b" fontWeight="600">
                        Row {row} — {floor.categories[row]}
                      </text>

                      {/* Junction node */}
                      <polygon
                        points={`${jNode.x},${jNode.y - 6} ${jNode.x + 6},${jNode.y} ${jNode.x},${jNode.y + 6} ${jNode.x - 6},${jNode.y}`}
                        fill={routeInfo.activeNodes.has(`J:${row}`) ? "#10b981" : "#94a3b8"}
                      />

                      {/* Shelves */}
                      {COLS.map((c) => {
                        const sid = `${row}${c}`;
                        const sNode = NODES_META[sid];
                        const isTarget = sid === targetShelf;

                        return (
                          <g key={sid}>
                            <rect
                              x={sNode.x - 11}
                              y={sNode.y - 10}
                              width={22}
                              height={20}
                              rx={4}
                              fill={isTarget ? "#10b981" : "#f1f5f9"}
                              stroke={isTarget ? "#065f46" : "#cbd5e1"}
                              strokeWidth={isTarget ? 2.5 : 1}
                            />
                            <text
                              x={sNode.x}
                              y={sNode.y + 3}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="800"
                              fill={isTarget ? "#ffffff" : "#64748b"}
                            >
                              {sid}
                            </text>
                            {isTarget && (
                              <text
                                x={sNode.x}
                                y={sNode.y - 13}
                                textAnchor="middle"
                                fontSize="8.5"
                                fontWeight="800"
                                fill="#059669"
                              >
                                🎯 ITEM
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* User starting node on Ground Floor */}
                {floor.id === "ground" && userPosition === ENTRANCE && (
                  <>
                    <line
                      x1={NODES_META[ENTRANCE].x}
                      y1={NODES_META[ENTRANCE].y}
                      x2={NODES_META["J:A"].x}
                      y2={NODES_META["J:A"].y}
                      stroke="#10b981"
                      strokeWidth={4.5}
                    />
                    <circle cx={NODES_META[ENTRANCE].x} cy={NODES_META[ENTRANCE].y} r={7} fill="#2563eb" />
                    <text
                      x={NODES_META[ENTRANCE].x + 12}
                      y={NODES_META[ENTRANCE].y + 3}
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#1d4ed8"
                    >
                      👤 YOU (ENTRANCE)
                    </text>
                  </>
                )}
              </svg>
            </div>
          );
        })}
      </div>

      {/* Turn-by-Turn Dijkstra Path Steps */}
      <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>
          🚶 Step-by-Step Dijkstra Path ({routeInfo.path.join(" → ")})
        </div>
        <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#334155", lineHeight: 1.6 }}>
          {routeInfo.steps.map((s, idx) => (
            <li key={idx} style={{ fontWeight: idx === routeInfo.steps.length - 1 ? 700 : 500 }}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
