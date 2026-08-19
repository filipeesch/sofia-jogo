// Structural auto-check for "Vale das Montanhas" (DoD #2).
// Runs in Node (type-stripped TS import of the pure layout module + three for
// the road splines, matching Roads.ts sampling).
//
//   node scripts/check-mountain-level.mjs
//
// Checks:
//  1. solid-solid clearance (no object overlaps another)
//  2. animal wander circles stay clear of roads / water / solids
//  3. roads vs water (no crossing), roads vs solids, roads stay on the floor
//  4. road graph connected (every road links, directly or via others, to R1)
//  5. y = terrainHeight for every placed object
//  6. houses sit in the "beside the road" band [5.1, 8.1]
//  7. car spawn (0,20) is on the main road
//  8. no dead ends: every road endpoint is shared with another road
//     (skill rule 6 — the network is a union of closed rings)
//  9. control deflection between consecutive segments ≤ 60° (skill rule 7)
// 10. at least 30 animals (skill rule 17)
import * as THREE from 'three';
import {
  buildMountainsLayout,
  layoutSolids,
  mountainTerrainHeight,
  MOUNTAINS_WATERS,
  MOUNTAINS_ROADS,
  MOUNTAINS_FOREST,
  ROAD_HALF_WIDTH
} from '../src/world/mountainsLayout.ts';

const issues = [];
const layout = buildMountainsLayout();
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
const sampled = MOUNTAINS_ROADS.map((def) => sampleRoad(def));
const allRoadPts = sampled.flat();

function distToRoad(x, z) {
  let best = Infinity;
  for (const [px, pz] of allRoadPts) best = Math.min(best, Math.hypot(x - px, z - pz));
  return best;
}

// 1. solid-solid clearance
// (peak x snowman is intentional: the snowman stands on the peak slope.)
function intentionalPair(a, b) {
  return (a.kind === 'peak' && b.kind === 'snowman') || (a.kind === 'snowman' && b.kind === 'peak');
}
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i];
    const b = solids[j];
    if (intentionalPair(a, b)) continue;
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
    // ducks live at the water's edge: base on the shore of one of the waters
    const onShore = MOUNTAINS_WATERS.some(
      (w) => {
        const d = Math.hypot(a.x - w.x, a.z - w.z);
        return d >= w.r && d <= w.r + 1.6;
      }
    );
    if (!onShore) issues.push(`duck(${a.x},${a.z}): not on a water's-edge band`);
  } else {
    // wander must not reach the closest water's edge
    const rClosest = Math.min(...MOUNTAINS_WATERS.map((w) => Math.hypot(a.x - w.x, a.z - w.z) - w.r));
    if (a.wanderR + 0.2 > rClosest) {
      issues.push(`animal ${a.type}(${a.x},${a.z}): wander ${a.wanderR} reaches water`);
    }
  }
  for (const s of solids) {
    if (s.kind === 'animal') continue; // animals coexist with each other
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < a.wanderR + s.r + 0.2) {
      issues.push(`animal ${a.type}(${a.x},${a.z}): wander ${a.wanderR} hits ${s.kind}(${s.x.toFixed(1)},${s.z.toFixed(1)})`);
    }
  }
}

// 3. road vs water / solids / floor
let roadMaxH = 0;
for (const [x, z] of allRoadPts) {
  for (const w of MOUNTAINS_WATERS) {
    if (Math.hypot(x - w.x, z - w.z) < ROAD_HALF_WIDTH + w.r + 0.3) {
      issues.push(`road cuts water at (${x.toFixed(1)},${z.toFixed(1)})`);
    }
  }
  roadMaxH = Math.max(roadMaxH, mountainTerrainHeight(x, z));
  for (const s of solids) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < ROAD_HALF_WIDTH + s.r + 0.3) {
      issues.push(`road touches ${s.kind}(${s.x.toFixed(1)},${s.z.toFixed(1)}) at (${x.toFixed(1)},${z.toFixed(1)})`);
    }
  }
}
if (roadMaxH > 0.3) issues.push(`road climbs the terrain (max height ${roadMaxH.toFixed(2)})`);

// 4. connectivity: the road graph is one component anchored at R1 (the main
// road). A road connects to the component when an endpoint lies on a road
// already in the component (junctions share control points).
const connected = new Set([0]);
let changed = true;
while (changed) {
  changed = false;
  for (let i = 0; i < MOUNTAINS_ROADS.length; i++) {
    if (connected.has(i)) continue;
    for (const j of connected) {
      if (i === j) continue;
      for (const [ex, ez] of [MOUNTAINS_ROADS[i][0], MOUNTAINS_ROADS[i][MOUNTAINS_ROADS[i].length - 1]]) {
        for (const [sx, sz] of [MOUNTAINS_ROADS[j][0], MOUNTAINS_ROADS[j][MOUNTAINS_ROADS[j].length - 1]]) {
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
for (let i = 0; i < MOUNTAINS_ROADS.length; i++) {
  if (!connected.has(i)) {
    const [sx, sz] = MOUNTAINS_ROADS[i][0];
    issues.push(`road ${i} starts at (${sx},${sz}) and is not connected to the network`);
  }
}

// 5. y = terrainHeight for every placed object
function checkY(name, x, z, y) {
  if (Math.abs(y - mountainTerrainHeight(x, z)) > 1e-6) issues.push(`${name}(${x},${z}): y ${y} != terrain ${mountainTerrainHeight(x, z)}`);
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
for (const s of layout.snowmen) checkY('snowman', s.x, s.z, s.y);

// 6. houses in the beside-the-road band
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// 7. car spawn on the main road
const spawnD = distToRoad(0, 20);
if (spawnD > ROAD_HALF_WIDTH) issues.push(`car spawn (0,20) is ${spawnD.toFixed(2)} from the main road`);

// 8. no dead ends: every road endpoint must be shared (within eps) with at
// least one other road — the network is a union of closed rings (skill rule 6),
// so a tour of the whole network needs no U-turn.
const endpoints = MOUNTAINS_ROADS.map((r) => [r[0], r[r.length - 1]]);
for (let i = 0; i < MOUNTAINS_ROADS.length; i++) {
  for (const [ex, ez] of endpoints[i]) {
    let shared = false;
    for (let j = 0; j < MOUNTAINS_ROADS.length; j++) {
      if (j === i) continue;
      for (const [sx, sz] of endpoints[j]) {
        if (Math.hypot(ex - sx, ez - sz) < 0.8) shared = true;
      }
      if (shared) break;
    }
    if (!shared) issues.push(`road ${i}: dead end at (${ex},${ez}) — no other road shares this endpoint`);
  }
}

// 9. deflection between consecutive control segments ≤ 60° (no 90° corners;
// the Catmull-Rom spline smooths the control points further — skill rule 7).
for (let i = 0; i < MOUNTAINS_ROADS.length; i++) {
  const pts = MOUNTAINS_ROADS[i];
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

// 10. at least 30 animals (skill rule 17)
if (layout.animals.length < 30) issues.push(`only ${layout.animals.length} animals — need ≥ 30`);

// summary
const nTrees = layout.trees.length;
const nForest = layout.trees.filter(
  (t) => Math.hypot(t.x - MOUNTAINS_FOREST.x, t.z - MOUNTAINS_FOREST.z) <= MOUNTAINS_FOREST.outer + 0.5
).length;
console.log(
  `layout: seed=${layout.seed} trees=${nTrees} (forest ${nForest}) animals=${layout.animals.length} ` +
    `houses=${layout.houses.length} lamps=${layout.lamps.length} benches=${layout.benches.length} ` +
    `snowmen=${layout.snowmen.length} solids=${solids.length} roadPts=${allRoadPts.length}`
);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
} else {
  console.log('OK: all structural checks passed.');
}
