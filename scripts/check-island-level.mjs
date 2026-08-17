// Structural auto-check for "Ilha Feliz" (DoD #2).
// Runs in Node (type-stripped TS import of the pure layout module + three for
// the road splines, matching Roads.ts sampling).
//
//   node scripts/check-island-level.mjs
//
// Checks:
//  1. solid-solid clearance (no object overlaps another)
//  2. animal wander circles stay clear of roads / lagoon / solids
//  3. roads vs lagoon (no crossing), roads vs solids, roads stay on the island
//  4. road graph connected (every road links, directly or via others, to R1)
//  5. y = terrainHeight for every placed object
//  6. houses sit in the "beside the road" band [5.1, 8.1]
//  7. airplane spawn (0,42) is over the island, clear of the lagoon
import * as THREE from 'three';
import {
  buildIslandLayout,
  layoutSolids,
  islandTerrainHeight,
  ISLAND_LAGOON,
  ISLAND_RADIUS,
  ISLAND_ROADS,
  ROAD_HALF_WIDTH
} from '../src/world/islandLayout.ts';

const issues = [];
const layout = buildIslandLayout();
const solids = layoutSolids(layout);

// ---- road splines (same math as Roads.ts) ----
function sampleRoad(def, n = 70) {
  const pts = def.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    out.push([p.x, p.z]);
  }
  return out;
}
const sampled = ISLAND_ROADS.map((def) => sampleRoad(def));
const allRoadPts = sampled.flat();

function distToRoad(x, z) {
  let best = Infinity;
  for (const [px, pz] of allRoadPts) best = Math.min(best, Math.hypot(x - px, z - pz));
  return best;
}

// 1. solid-solid clearance
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i];
    const b = solids[j];
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    const need = a.r + b.r + Math.max(a.clearance, b.clearance);
    if (d < need) issues.push(`solids: ${a.kind}(${a.x},${a.z}) x ${b.kind}(${b.x},${b.z}) dist ${d.toFixed(2)} < ${need.toFixed(2)}`);
  }
}

// 2. animal wander circles
for (const a of layout.animals) {
  const dRoad = distToRoad(a.x, a.z);
  if (dRoad < a.wanderR + ROAD_HALF_WIDTH + 0.2) {
    issues.push(`animal ${a.type}(${a.x},${a.z}): wander ${a.wanderR} reaches the road (dist ${dRoad.toFixed(2)})`);
  }
  if (a.type === 'duck') {
    // ducks live at the lagoon's edge: base on the shore band [r, r+1.6]
    const d = Math.hypot(a.x - ISLAND_LAGOON.x, a.z - ISLAND_LAGOON.z);
    if (d < ISLAND_LAGOON.r || d > ISLAND_LAGOON.r + 1.6) issues.push(`duck(${a.x},${a.z}): not on the lagoon's-edge band (d ${d.toFixed(2)})`);
  } else {
    // wander must not reach the lagoon's edge
    const rClosest = Math.hypot(a.x - ISLAND_LAGOON.x, a.z - ISLAND_LAGOON.z) - ISLAND_LAGOON.r;
    if (a.wanderR + 0.2 > rClosest) issues.push(`animal ${a.type}(${a.x},${a.z}): wander ${a.wanderR} reaches the lagoon`);
  }
  for (const s of solids) {
    if (s.kind === 'animal') continue; // animals coexist with each other
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < a.wanderR + s.r + 0.2) {
      issues.push(`animal ${a.type}(${a.x},${a.z}): wander ${a.wanderR} hits ${s.kind}(${s.x.toFixed(1)},${s.z.toFixed(1)})`);
    }
  }
}

// 3. road vs lagoon / solids / island
for (const [x, z] of allRoadPts) {
  if (Math.hypot(x - ISLAND_LAGOON.x, z - ISLAND_LAGOON.z) < ROAD_HALF_WIDTH + ISLAND_LAGOON.r + 0.3) {
    issues.push(`road cuts the lagoon at (${x.toFixed(1)},${z.toFixed(1)})`);
  }
  if (Math.hypot(x, z) > ISLAND_RADIUS - 3) {
    issues.push(`road leaves the island at (${x.toFixed(1)},${z.toFixed(1)})`);
  }
  for (const s of solids) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < ROAD_HALF_WIDTH + s.r + 0.3) {
      issues.push(`road touches ${s.kind}(${s.x.toFixed(1)},${s.z.toFixed(1)}) at (${x.toFixed(1)},${z.toFixed(1)})`);
    }
  }
}

// 4. connectivity: the road graph is one component anchored at R1 (the main
// road). A road connects to the component when an endpoint lies on a road
// already in the component (junctions share control points).
const connected = new Set([0]);
let changed = true;
while (changed) {
  changed = false;
  for (let i = 0; i < ISLAND_ROADS.length; i++) {
    if (connected.has(i)) continue;
    for (const j of connected) {
      if (i === j) continue;
      for (const [ex, ez] of [ISLAND_ROADS[i][0], ISLAND_ROADS[i][ISLAND_ROADS[i].length - 1]]) {
        for (const [sx, sz] of [ISLAND_ROADS[j][0], ISLAND_ROADS[j][ISLAND_ROADS[j].length - 1]]) {
          if (Math.hypot(ex - sx, ez - sz) < 0.8) {
            connected.add(i);
            changed = true;
            break;
          }
        }
        if (connected.has(i)) break;
      }
      if (connected.has(i)) break;
    }
  }
}
for (let i = 0; i < ISLAND_ROADS.length; i++) {
  if (!connected.has(i)) {
    const [sx, sz] = ISLAND_ROADS[i][0];
    issues.push(`road ${i} starts at (${sx},${sz}) and is not connected to the network`);
  }
}

// 5. y = terrainHeight for every placed object
function checkY(name, x, z, y) {
  if (Math.abs(y - islandTerrainHeight(x, z)) > 1e-6) issues.push(`${name}(${x},${z}): y ${y} != terrain ${islandTerrainHeight(x, z)}`);
}
for (const h of layout.houses) checkY('house', h.x, h.z, h.y);
for (const l of layout.lamps) checkY('lamp', l.x, l.z, l.y);
for (const b of layout.benches) checkY('bench', b.x, b.z, b.y);
checkY('barn', layout.barn.x, layout.barn.z, layout.barn.y);
for (const f of layout.fencePosts) checkY('fence', f.x, f.z, f.y);
for (const a of layout.animals) checkY(a.type, a.x, a.z, a.y);
for (const t of layout.trees) checkY('tree', t.x, t.z, t.y);
for (const b of layout.bushes) checkY('bush', b.x, b.z, b.y);
for (const f of layout.flowers) checkY('flower', f.x, f.z, f.y);

// 6. houses in the beside-the-road band
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// 7. airplane spawn over the island, clear of the lagoon
const spawn = { x: 0, z: 42 };
if (Math.hypot(spawn.x, spawn.z) > ISLAND_RADIUS - 3) issues.push(`airplane spawn (0,42) is off the island`);
if (Math.hypot(spawn.x - ISLAND_LAGOON.x, spawn.z - ISLAND_LAGOON.z) < ISLAND_LAGOON.r + 4) {
  issues.push('airplane spawn (0,42) is too close to the lagoon');
}

// summary
const nPalms = layout.trees.filter((t) => t.palm).length;
console.log(
  `layout: seed=${layout.seed} trees=${layout.trees.length} (palms ${nPalms}) animals=${layout.animals.length} ` +
    `houses=${layout.houses.length} lamps=${layout.lamps.length} benches=${layout.benches.length} ` +
    `fence=${layout.fencePosts.length} solids=${solids.length} roadPts=${allRoadPts.length}`
);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
} else {
  console.log('OK: all structural checks passed.');
}
