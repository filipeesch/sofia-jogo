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
//  4. no dead ends: every road endpoint is shared with another road
//     (skill rule 6 — the network is a union of closed rings)
//  5. control deflection between consecutive segments ≤ 60° (skill rule 7)
//  6. y = terrainHeight for every placed object
//  7. houses sit in the "beside the road" band [5.1, 8.1]
//  8. animals ≥ 30 (skill rule 17)
//  9. airplane spawn (0,42) is over the island, clear of the lagoon
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

// 4. no dead ends: every road endpoint must be shared (within eps) with at
// least one other road — the network is a union of closed rings, so a tour
// of the whole network needs no U-turn.
const endpoints = ISLAND_ROADS.map((r) => [r[0], r[r.length - 1]]);
for (let i = 0; i < ISLAND_ROADS.length; i++) {
  for (const [ex, ez] of endpoints[i]) {
    let shared = false;
    for (let j = 0; j < ISLAND_ROADS.length; j++) {
      if (j === i) continue;
      for (const [sx, sz] of endpoints[j]) {
        if (Math.hypot(ex - sx, ez - sz) < 0.8) shared = true;
      }
      if (shared) break;
    }
    if (!shared) issues.push(`road ${i}: dead end at (${ex},${ez}) — no other road shares this endpoint`);
  }
}

// 5. deflection between consecutive control segments ≤ 60° (no 90° corners;
// the Catmull-Rom spline smooths the control points further).
for (let i = 0; i < ISLAND_ROADS.length; i++) {
  const pts = ISLAND_ROADS[i];
  for (let k = 1; k < pts.length - 1; k++) {
    const [ax, az] = pts[k - 1];
    const [bx, bz] = pts[k];
    const [cx, cz] = pts[k + 1];
    const v1x = bx - ax;
    const v1z = bz - az;
    const v2x = cx - bx;
    const v2z = cz - bz;
    const l1 = Math.hypot(v1x, v1z);
    const l2 = Math.hypot(v2x, v2z);
    if (l1 < 1e-9 || l2 < 1e-9) continue;
    const dot = Math.min(1, Math.max(-1, (v1x * v2x + v1z * v2z) / (l1 * l2)));
    const ang = (Math.acos(dot) * 180) / Math.PI;
    if (ang > 60) issues.push(`road ${i}: deflection ${ang.toFixed(1)}° > 60° at control point (${bx},${bz})`);
  }
}

// 6. y = terrainHeight for every placed object
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

// 7. houses in the beside-the-road band
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// 8. at least 30 animals (skill rule 17)
if (layout.animals.length < 30) issues.push(`only ${layout.animals.length} animals — need ≥ 30`);

// 9. airplane spawn over the island, clear of the lagoon
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
