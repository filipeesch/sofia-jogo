// Structural auto-check for "Deserto" (worldType 'desert').
// Runs in Node (type-stripped TS import of the pure layout module + three for
// the road splines, matching Roads.ts sampling).
//
//   node scripts/check-desert-level.mjs
//
// Checks:
//  1. determinism (build twice → deep equal)
//  2. all content positions ≤ r≈80
//  3. houses in the beside-the-road band [5.1, 8.1]
//  4. roads: 4 polylines; network is a union of closed rings — every road
//     endpoint is shared with another road within 0.8 m (no degree-1 nodes,
//     skill rule 6); none crosses the oasis
//  5. control deflection between consecutive segments ≤ 60° (skill rule 7)
//  6. every road spline sample (CatmullRom centripetal, 70 samples — same math
//     as src/rails/roadTour.ts, reimplemented locally) ≥ 2.0 m from every solid
//  7. spawn (0,20) ≤ 3 m from a road; POIs within 8 m of some road
//  8. lamps in the band [2.5, 5.0] from the sampled spline
//  9. animals ≥ 30 (skill rule 17); bases ≥ 3 m from roads, clear of the oasis,
//     and every wander circle free of roads / oasis / solids (skill rule 15)
// 10. flight tour (closed centripetal CatmullRom, 240 pts): 3.2≤y≤26 (tol 0.5),
//     clearance above terrain ≥ 1.5, waypoints within 8 m of the tour, the
//     rainbow point [24,10,-24] present in the waypoint list
// 11. no Math.random / rand() used for placement in the pure layout module
import * as THREE from 'three';
import {
  buildDesertLayout,
  layoutSolids,
  desertTerrainHeight,
  DESERT_ROADS,
  DESERT_OASIS,
  ROAD_HALF_WIDTH,
  ROAD_OASIS_CLEARANCE
} from '../src/world/desertLayout.ts';

const issues = [];

// ---- flight tour (hand-tuned waypoints for the desert 5x world) ----
const RAINBOW = [24, 10, -24];
const FLIGHT_WAYPOINTS = [
  [0, 13, 42], // takeoff over the southern dunes (≈ spawn)
  [-2, 12, 4], // village hub
  [30, 11, 26], // over the oasis
  [42, 12, 36], // south cactus alameda
  RAINBOW, // the global rainbow arch
  [-44, 18, -36], // pyramid cluster (big)
  [10, 12, 20] // south field (closes the circuit)
];

// ---- helpers ----
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

// Same sampling as Roads.ts / roadTour.ts: CatmullRom centripetal, 70 samples,
// inclusive of both ends. Reimplemented locally so this script stays pure.
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

// Flight tour sampling: closed centripetal CatmullRom, 240 points (getPointAt).
function sampleFlightTour(wp, n = 240) {
  const pts = wp.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const out = [];
  for (let i = 0; i < n; i++) out.push(curve.getPointAt(i / n).clone());
  return out;
}

function distToRoad(x, z, sampled) {
  let best = Infinity;
  for (const [px, pz] of sampled) best = Math.min(best, Math.hypot(x - px, z - pz));
  return best;
}

// ---- 1. determinism ----
const layout1 = buildDesertLayout();
const layout2 = buildDesertLayout();
if (!deepEqual(layout1, layout2)) issues.push('layout is not deterministic (two builds differ)');
const layout = layout1;
const solids = layoutSolids(layout);

// ---- 2. content radius ≤ 80 ----
function radiusCheck(name, x, z) {
  const r = Math.hypot(x, z);
  if (r > 80) issues.push(`${name}(${x.toFixed(1)},${z.toFixed(1)}): r ${r.toFixed(1)} > 80`);
}
for (const h of layout.houses) radiusCheck('house', h.x, h.z);
for (const p of layout.pyramids) radiusCheck('pyramid', p.x, p.z);
for (const c of layout.cacti) radiusCheck('cactus', c.x, c.z);
for (const a of layout.animals) radiusCheck('animal', a.x, a.z);
for (const l of layout.lamps) radiusCheck('lamp', l.x, l.z);
for (const d of layout.dunes) radiusCheck('dune', d.x, d.z);

// ---- 3. houses: band [5.1, 8.1] of the road ----
const sampled = DESERT_ROADS.map((def) => sampleRoad(def));
const allRoadPts = sampled.flat();
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z, allRoadPts);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// ---- 4. roads: count, closed-ring network (every endpoint shared), oasis ----
if (DESERT_ROADS.length !== 4) issues.push(`expected 4 roads, got ${DESERT_ROADS.length}`);
// No dead ends (skill rule 6): every polyline endpoint must be shared with
// another polyline's endpoint within 0.8 m — the network is a union of rings.
{
  const endpoints = DESERT_ROADS.map((r) => [r[0], r[r.length - 1]]);
  for (let i = 0; i < DESERT_ROADS.length; i++) {
    for (const [ex, ez] of endpoints[i]) {
      let shared = false;
      for (let j = 0; j < DESERT_ROADS.length; j++) {
        if (j === i) continue;
        for (const [sx, sz] of endpoints[j]) {
          if (Math.hypot(ex - sx, ez - sz) < 0.8) shared = true;
        }
        if (shared) break;
      }
      if (!shared) issues.push(`road ${i}: dead end at (${ex},${ez}) — no other road shares this endpoint`);
    }
  }
  // Connectivity sanity: every road touches the network (all endpoints shared
  // already implies this, kept as a belt-and-suspenders check).
  const meets = (i, j, pt) => {
    if (i === j) return false;
    for (const [px, pz] of sampled[j]) if (Math.hypot(px - pt[0], pz - pt[1]) < 0.8) return true;
    return false;
  };
  const connected = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < DESERT_ROADS.length; i++) {
      if (connected.has(i)) continue;
      for (const j of connected) {
        const ends = [DESERT_ROADS[i][0], DESERT_ROADS[i][DESERT_ROADS[i].length - 1]];
        if (ends.some((pt) => meets(i, j, pt))) {
          connected.add(i);
          changed = true;
          break;
        }
      }
      if (connected.has(i)) break;
    }
  }
  for (let i = 0; i < DESERT_ROADS.length; i++) {
    if (!connected.has(i)) issues.push(`road ${i} is not connected to the network`);
  }
}
// No road crosses the oasis disc: the road's centerline must not enter the
// water more than ROAD_OASIS_CLEARANCE (a safety net — the reworked ring A
// keeps every sample well outside the rim).
for (const [x, z] of allRoadPts) {
  const d = Math.hypot(x - DESERT_OASIS.x, z - DESERT_OASIS.z) - DESERT_OASIS.r;
  if (d < -ROAD_OASIS_CLEARANCE) {
    issues.push(`road crosses the oasis at (${x.toFixed(1)},${z.toFixed(1)}) — centerline ${(-d).toFixed(2)} m into the water`);
    break;
  }
}

// ---- 5. deflection between consecutive control segments ≤ 60° ----
for (let i = 0; i < DESERT_ROADS.length; i++) {
  const pts = DESERT_ROADS[i];
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

// ---- 6. road samples ≥ 2.0 m from every solid ----
// Animal solids are exempt: the on-rails tour's lateral shift (≤1.35 m) keeps
// the car ≥ 2.0 m from an animal solid (r=1.0) when the animal base is ≥ 3 m
// from the road; the animal's ±wanderR movement is not modeled as a solid.
for (const [x, z] of allRoadPts) {
  for (const s of solids) {
    if (s.kind === 'animal') continue;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r + 2.0) issues.push(`road sample (${x.toFixed(1)},${z.toFixed(1)}) is ${d.toFixed(2)} from solid r=${s.r} (need ≥ ${(s.r + 2.0).toFixed(1)})`);
  }
}

// ---- 7. spawn + POI reachability ----
const spawnD = distToRoad(0, 20, allRoadPts);
if (spawnD > 3.0) issues.push(`road ${spawnD.toFixed(2)} m from car spawn (0,20) — need ≤ 3`);
const pois = [
  { name: 'vila', x: -2, z: 2 },
  { name: 'oasis', x: 26, z: 36 }, // margem NE do oásis (perto da estrada)
  { name: 'pyramids', x: -40, z: -30 }, // borda do cluster (aproximação da estrada)
  { name: 'cactus alameda', x: 42, z: 36 } // alameda de cactos sul
];
for (const p of pois) {
  const d = distToRoad(p.x, p.z, allRoadPts);
  if (d > 8) issues.push(`POI ${p.name} (${p.x},${p.z}) is ${d.toFixed(2)} m from the nearest road (need ≤ 8)`);
}

// ---- 8. lamps: band [2.5, 5.0] from the sampled spline ----
for (const l of layout.lamps) {
  const d = distToRoad(l.x, l.z, allRoadPts);
  if (d < 2.5 || d > 5.0) issues.push(`lamp(${l.x},${l.z}): ${d.toFixed(2)} m from spline (band [2.5, 5.0])`);
}

// ---- 9. animals: count, roads, oasis, wander circles ----
if (layout.animals.length < 30) issues.push(`only ${layout.animals.length} animals — need ≥ 30 (skill rule 17)`);
for (const a of layout.animals) {
  const dRoad = distToRoad(a.x, a.z, allRoadPts);
  if (dRoad < 3.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): ${dRoad.toFixed(2)} m from road (need ≥ 3)`);
  const dOasis = Math.hypot(a.x - DESERT_OASIS.x, a.z - DESERT_OASIS.z);
  if (dOasis < DESERT_OASIS.r + 1.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): inside the oasis rim`);
  // Wander circle: must not reach the road, the oasis or any solid.
  if (dRoad < a.wanderR + ROAD_HALF_WIDTH + 0.2) {
    issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): wander ${a.wanderR} reaches the road (dist ${dRoad.toFixed(2)})`);
  }
  const rimClear = dOasis - DESERT_OASIS.r;
  if (a.wanderR + 0.2 > rimClear) {
    issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): wander ${a.wanderR} reaches the oasis`);
  }
  for (const s of solids) {
    if (s.kind === 'animal') continue; // animals coexist with each other
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < a.wanderR + s.r + 0.2) {
      issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): wander ${a.wanderR} hits ${s.kind}(${s.x.toFixed(1)},${s.z.toFixed(1)})`);
    }
  }
}

// ---- 10. flight tour ----
{
  const tour = sampleFlightTour(FLIGHT_WAYPOINTS);
  let minY = Infinity;
  let maxY = -Infinity;
  let minClear = Infinity;
  for (const p of tour) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minClear = Math.min(minClear, p.y - desertTerrainHeight(p.x, p.z));
  }
  if (minY < 3.2 - 0.5) issues.push(`flight tour dips to y=${minY.toFixed(2)} (band [3.2, 26] tol 0.5)`);
  if (maxY > 26 + 0.5) issues.push(`flight tour climbs to y=${maxY.toFixed(2)} (band [3.2, 26] tol 0.5)`);
  if (minClear < 1.5) issues.push(`flight tour terrain clearance ${minClear.toFixed(2)} < 1.5`);
  for (const [x, y, z] of FLIGHT_WAYPOINTS) {
    let best = Infinity;
    for (const p of tour) best = Math.min(best, Math.hypot(p.x - x, p.y - y, p.z - z));
    if (best > 8) issues.push(`waypoint (${x},${y},${z}) is ${best.toFixed(2)} m from the sampled tour (need ≤ 8)`);
  }
  const hasRainbow = FLIGHT_WAYPOINTS.some((w) => w[0] === RAINBOW[0] && w[1] === RAINBOW[1] && w[2] === RAINBOW[2]);
  if (!hasRainbow) issues.push('flight tour waypoints do not include the rainbow point [24,10,-24]');
}

// ---- 11. no Math.random in the pure layout ----
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/world/desertLayout.ts', import.meta.url), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (/\bMath\.random\s*\(/.test(line)) issues.push(`desertLayout.ts:${i + 1}: Math.random used for placement`);
    if (/\brand\s*\(/.test(line)) issues.push(`desertLayout.ts:${i + 1}: rand() used for placement`);
  });
}

// ---- solid-solid sanity (layout self-consistency) ----
// Animals coexist with each other (wander overlap is fine), and the cactus
// ring is a deliberate cluster; only unexpected overlaps are reported.
const animalSolid = new Set(layout.animals.map((_, i) => i));
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i];
    const b = solids[j];
    if (a === null || b === null) continue;
    const isAnimalA = animalSolid.has(i);
    const isAnimalB = animalSolid.has(j);
    if (isAnimalA && isAnimalB) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    const need = a.r + b.r + 0.1;
    if (d < need - 1e-9) issues.push(`solids overlap at (${a.x.toFixed(1)},${a.z.toFixed(1)})/(${b.x.toFixed(1)},${b.z.toFixed(1)}): dist ${d.toFixed(2)} < ${need.toFixed(2)}`);
  }
}

// summary
const animalCount = {};
for (const a of layout.animals) animalCount[a.type] = (animalCount[a.type] ?? 0) + 1;
console.log(
  `layout: seed=${layout.seed} houses=${layout.houses.length} pyramids=${layout.pyramids.length} ` +
    `cacti=${layout.cacti.length} animals=${layout.animals.length} lamps=${layout.lamps.length} ` +
    `solids=${solids.length} roadPts=${allRoadPts.length} animalsByType=${JSON.stringify(animalCount)}`
);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
} else {
  console.log('OK: all structural checks passed.');
}
