// Structural auto-check for "Mundo da Neve" (worldType 'snow').
// Runs in Node (type-stripped TS import of the pure layout module + three for
// the road splines, matching Roads.ts sampling).
//
//   node scripts/check-snow-level.mjs
//
// Checks:
//  1. determinism (build twice → deep equal)
//  2. all content positions ≤ r≈80
//  3. houses in the beside-the-road band [5.1, 8.1]
//  4. roads: connected network, 4 roads, none crosses the frozen lake
//  5. every road spline sample (CatmullRom centripetal, 70 samples — same math
//     as src/rails/roadTour.ts, reimplemented locally) ≥ 2.0 m from every solid
//  6. R1 within 3 m of the car spawn (0,20); POIs within 8 m of some road
//  7. animals: ≥ 3 m from roads and clear of the lake
//  8. flight tour (closed centripetal CatmullRom, 240 pts): 3.2≤y≤26 (tol 0.5),
//     clearance above terrain ≥ 1.5, waypoints within 8 m of the tour, the
//     rainbow point [24,10,-24] present in the waypoint list
//  9. no Math.random / rand() used for placement in the pure layout module
import * as THREE from 'three';
import {
  buildSnowLayout,
  layoutSolids,
  snowTerrainHeight,
  SNOW_LAKE,
  SNOW_ROADS,
  SNOW_HOUSES,
  ROAD_HALF_WIDTH
} from '../src/world/snowLayout.ts';

const issues = [];

// ---- flight tour (hand-tuned waypoints for the snow 5x world) ----
const RAINBOW = [24, 10, -24];
const FLIGHT_WAYPOINTS = [
  [0, 13, 42], // takeoff over the southern drifts (≈ spawn)
  [0, 11, 6], // village
  [-20, 12, -14], // west drifts / ice path
  [-26, 9, -20], // over the frozen lake
  RAINBOW, // the global rainbow arch
  [38, 11, -6], // over the pine grove
  [20, 10, 14] // east ring + village snowmen
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
// inclusive of both ends.
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
const layout1 = buildSnowLayout();
const layout2 = buildSnowLayout();
if (!deepEqual(layout1, layout2)) issues.push('layout is not deterministic (two builds differ)');
const layout = layout1;
const solids = layoutSolids(layout);

// ---- 2. content radius ≤ 80 ----
function radiusCheck(name, x, z) {
  const r = Math.hypot(x, z);
  if (r > 80) issues.push(`${name}(${x.toFixed(1)},${z.toFixed(1)}): r ${r.toFixed(1)} > 80`);
}
for (const h of layout.houses) radiusCheck('house', h.x, h.z);
for (const p of layout.pines) radiusCheck('pine', p.x, p.z);
for (const s of layout.snowmen) radiusCheck('snowman', s.x, s.z);
for (const a of layout.animals) radiusCheck('animal', a.x, a.z);
for (const l of layout.lamps) radiusCheck('lamp', l.x, l.z);
for (const d of layout.hills) radiusCheck('drift', d.x + d.r, d.z); // outer edge

// ---- 3. houses: band [5.1, 8.1] of the road ----
const sampled = SNOW_ROADS.map((def) => sampleRoad(def));
const allRoadPts = sampled.flat();
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z, allRoadPts);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// ---- 4. roads: count, connectivity, lake clearance ----
if (SNOW_ROADS.length !== 4) issues.push(`expected 4 roads, got ${SNOW_ROADS.length}`);
{
  const meets = (i, j, pt) => {
    if (i === j) return false;
    for (const [px, pz] of sampled[j]) if (Math.hypot(px - pt[0], pz - pt[1]) < 0.8) return true;
    return false;
  };
  const connected = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < SNOW_ROADS.length; i++) {
      if (connected.has(i)) continue;
      for (const j of connected) {
        const ends = [SNOW_ROADS[i][0], SNOW_ROADS[i][SNOW_ROADS[i].length - 1]];
        if (ends.some((pt) => meets(i, j, pt))) {
          connected.add(i);
          changed = true;
          break;
        }
      }
      if (connected.has(i)) break;
    }
  }
  for (let i = 0; i < SNOW_ROADS.length; i++) {
    if (!connected.has(i)) {
      const [sx, sz] = SNOW_ROADS[i][0];
      issues.push(`road ${i} starts at (${sx},${sz}) and is not connected to the network`);
    }
  }
}
// No road crosses the frozen lake disc (centerline stays ≥ 0.5 m outside).
for (const [x, z] of allRoadPts) {
  const d = Math.hypot(x - SNOW_LAKE.x, z - SNOW_LAKE.z) - SNOW_LAKE.r;
  if (d < -0.5) {
    issues.push(`road crosses the lake at (${x.toFixed(1)},${z.toFixed(1)}) — centerline ${(-d).toFixed(2)} m into the water`);
    break;
  }
}

// ---- 5. road samples ≥ 2.0 m from every solid ----
for (const [x, z] of allRoadPts) {
  for (const s of solids) {
    if (s.kind === 'animal') continue; // wander movement is not modeled as a solid
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r + 2.0) issues.push(`road sample (${x.toFixed(1)},${z.toFixed(1)}) is ${d.toFixed(2)} from solid r=${s.r.toFixed(2)} (need ≥ ${(s.r + 2.0).toFixed(1)})`);
  }
}

// ---- 6. spawn + POI reachability ----
const spawnD = distToRoad(0, 20, allRoadPts);
if (spawnD > 3.0) issues.push(`R1 ${spawnD.toFixed(2)} m from car spawn (0,20) — need ≤ 3`);
const pois = [
  { name: 'vila', x: 0, z: -6 },
  { name: 'lago', x: -18, z: -13 }, // beira do lago congelado
  { name: 'pinheiral', x: 40, z: -4 },
  { name: 'arco-íris', x: 24, z: -24 }
];
for (const p of pois) {
  const d = distToRoad(p.x, p.z, allRoadPts);
  if (d > 8) issues.push(`POI ${p.name} (${p.x},${p.z}) is ${d.toFixed(2)} m from the nearest road (need ≤ 8)`);
}

// ---- 7. animals: roads and lake ----
for (const a of layout.animals) {
  const dRoad = distToRoad(a.x, a.z, allRoadPts);
  if (dRoad < 3.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): ${dRoad.toFixed(2)} m from road (need ≥ 3)`);
  const dLake = Math.hypot(a.x - SNOW_LAKE.x, a.z - SNOW_LAKE.z);
  if (dLake < SNOW_LAKE.r + 1.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): inside the lake rim`);
}

// ---- 8. flight tour ----
{
  const tour = sampleFlightTour(FLIGHT_WAYPOINTS);
  let minY = Infinity;
  let maxY = -Infinity;
  let minClear = Infinity;
  for (const p of tour) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minClear = Math.min(minClear, p.y - snowTerrainHeight(p.x, p.z));
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

// ---- 9. no Math.random in the pure layout ----
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/world/snowLayout.ts', import.meta.url), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/\bMath\.random\s*\(/.test(line)) issues.push(`snowLayout.ts:${i + 1}: Math.random used for placement`);
    if (/\brand\s*\(/.test(line)) issues.push(`snowLayout.ts:${i + 1}: rand() used for placement`);
  });
}

// ---- solid-solid sanity (layout self-consistency) ----
for (let i = 0; i < solids.length; i++) {
  for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i];
    const b = solids[j];
    if (a.kind === 'animal' && b.kind === 'animal') continue; // wander overlap is fine
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    const need = a.r + b.r + 0.1;
    if (d < need - 1e-9) issues.push(`solids overlap at (${a.x.toFixed(1)},${a.z.toFixed(1)})/(${b.x.toFixed(1)},${b.z.toFixed(1)}): dist ${d.toFixed(2)} < ${need.toFixed(2)}`);
  }
}

// summary
const animalCount = {};
for (const a of layout.animals) animalCount[a.type] = (animalCount[a.type] ?? 0) + 1;
console.log(
  `layout: seed=${layout.seed} houses=${layout.houses.length} pines=${layout.pines.length} ` +
    `snowmen=${layout.snowmen.length} animals=${layout.animals.length} lamps=${layout.lamps.length} ` +
    `solids=${solids.length} roadPts=${allRoadPts.length} animalsByType=${JSON.stringify(animalCount)}`
);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
} else {
  console.log('OK: all structural checks passed.');
}
