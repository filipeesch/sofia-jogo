// Structural auto-check for "Vale Vivo" (worldType 'valley').
// Runs in Node (type-stripped TS import of the pure layout module + three for
// the road splines, matching Roads.ts sampling).
//
//   node scripts/check-valley-level.mjs
//
// Checks:
//  1. determinism (build twice → deep equal)
//  2. content within r≈95 (hill centers ≤ r≈85)
//  3. houses in the beside-the-road band [5.1, 8.1] on spline samples
//  4. roads: 5 roads, connected network, none crosses the lake, R4 ends on
//     the east fence line at the farm gate
//  5. every road spline sample (CatmullRom centripetal, 70 samples — same math
//     as src/rails/roadTour.ts) ≥ solid.r + 2.0 m from every solid
//  6. spawn (0,20) on R1; POIs within 8 m of some road
//  7. animals: ≥ 3 m from roads, out of the water, 6 inside the fenced pen
//  8. ducks in the lake shore band [r, r+1.6]
//  9. lamps: beside a road (2..5 m), clear of solids
// 10. flight tour (closed centripetal CatmullRom, 240 pts): 3.2≤y≤26 (tol 0.5),
//     clearance above terrain ≥ 1.5, waypoint/POI consistency, rainbow pass
// 11. no Math.random / rand() used for placement in the pure layout module
// 12. solid-solid sanity (animal-animal skipped)
import * as THREE from 'three';
import {
  buildValleyLayout,
  layoutSolids,
  valleyTerrainHeight,
  VALLEY_LAKE,
  VALLEY_ROADS,
  VALLEY_FARM,
  VALLEY_HILLS,
  VALLEY_FOREST,
  ROAD_HALF_WIDTH
} from '../src/world/valleyLayout.ts';

const issues = [];

// ---- flight tour (hand-tuned waypoints for the valley 5x world; same list as
//      src/rails/flightTour.ts) ----
const RAINBOW = [24, 10, -24];
const FLIGHT_WAYPOINTS = [
  [0, 13, 42], // takeoff over the southern meadow (near spawn)
  [0, 11, 2], // village hub
  RAINBOW, // the global rainbow arch
  [50, 14, -30], // over the lake
  [56, 14, 48], // over the forest
  [6, 12, 54], // southern meadow
  [-64, 14, 34], // over the farm
  [-30, 13, 0] // western meadow, back to the vila
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
const layout1 = buildValleyLayout();
const layout2 = buildValleyLayout();
if (!deepEqual(layout1, layout2)) issues.push('layout is not deterministic (two builds differ)');
const layout = layout1;
const solids = layoutSolids(layout);

// ---- 2. content radius ≤ 95 (hill centers ≤ 85) ----
function radiusCheck(name, x, z, r = 95) {
  const d = Math.hypot(x, z);
  if (d > r) issues.push(`${name}(${x.toFixed(1)},${z.toFixed(1)}): r ${d.toFixed(1)} > ${r}`);
}
for (const h of layout.houses) radiusCheck('house', h.x, h.z);
for (const t of layout.trees) radiusCheck('tree', t.x, t.z);
for (const a of layout.animals) radiusCheck('animal', a.x, a.z);
for (const l of layout.lamps) radiusCheck('lamp', l.x, l.z);
for (const b of layout.benches) radiusCheck('bench', b.x, b.z);
for (const b of layout.bushes) radiusCheck('bush', b.x, b.z);
for (const f of layout.flowers) radiusCheck('flower', f.x, f.z);
for (const p of layout.fencePosts) radiusCheck('fence', p.x, p.z);
for (const d of layout.ducks) radiusCheck('duck', d.x, d.z);
radiusCheck('barn', layout.barn.x, layout.barn.z);
for (const hill of VALLEY_HILLS) radiusCheck('hill center', hill.x, hill.z, 85);

// ---- 3. houses: band [5.1, 8.1] of the road spline ----
const sampled = VALLEY_ROADS.map((def) => sampleRoad(def));
const allRoadPts = sampled.flat();
for (const h of layout.houses) {
  const d = distToRoad(h.x, h.z, allRoadPts);
  if (d < 5.1 || d > 8.1) issues.push(`house(${h.x},${h.z}): dist to road ${d.toFixed(2)} outside band [5.1, 8.1]`);
}

// ---- 4. roads: count, connectivity, lake clearance, farm gate ----
if (VALLEY_ROADS.length !== 5) issues.push(`expected 5 roads, got ${VALLEY_ROADS.length}`);
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
    for (let i = 0; i < VALLEY_ROADS.length; i++) {
      if (connected.has(i)) continue;
      for (const j of connected) {
        const ends = [VALLEY_ROADS[i][0], VALLEY_ROADS[i][VALLEY_ROADS[i].length - 1]];
        if (ends.some((pt) => meets(i, j, pt))) {
          connected.add(i);
          changed = true;
          break;
        }
      }
      if (connected.has(i)) break;
    }
  }
  for (let i = 0; i < VALLEY_ROADS.length; i++) {
    if (!connected.has(i)) {
      const [sx, sz] = VALLEY_ROADS[i][0];
      issues.push(`road ${i} starts at (${sx},${sz}) and is not connected to the network`);
    }
  }
}
// No road crosses the lake (centerline stays ≥ 0.5 m outside the water).
for (const [x, z] of allRoadPts) {
  const d = Math.hypot(x - VALLEY_LAKE.x, z - VALLEY_LAKE.z) - VALLEY_LAKE.r;
  if (d < -0.5) {
    issues.push(`road crosses the lake at (${x.toFixed(1)},${z.toFixed(1)}) — centerline ${(-d).toFixed(2)} m into the water`);
    break;
  }
}
// R4 must end at the farm gate, on the east fence line of the pen.
{
  const [gx, gz] = VALLEY_ROADS[3][VALLEY_ROADS[3].length - 1];
  const onFenceLine = Math.abs(gx - (VALLEY_FARM.cx + VALLEY_FARM.half)) < 0.6;
  const inFenceSpan = gz >= VALLEY_FARM.cz - VALLEY_FARM.half - 0.6 && gz <= VALLEY_FARM.cz + VALLEY_FARM.half + 0.6;
  if (!onFenceLine || !inFenceSpan) issues.push(`R4 ends at (${gx},${gz}) — need the farm gate on the east fence line`);
}

// ---- 5. road samples ≥ solid.r + 2.0 m from every solid ----
for (const [x, z] of allRoadPts) {
  for (const s of solids) {
    if (s.kind === 'animal') continue; // wander movement is not modeled as a solid
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r + 2.0) issues.push(`road sample (${x.toFixed(1)},${z.toFixed(1)}) is ${d.toFixed(2)} from ${s.kind} r=${s.r.toFixed(2)} (need ≥ ${(s.r + 2.0).toFixed(1)})`);
  }
}

// ---- 6. spawn + POI reachability ----
const spawnD = distToRoad(0, 20, allRoadPts);
if (spawnD > 3.0) issues.push(`car spawn (0,20) is ${spawnD.toFixed(2)} m from R1 (need ≤ 3)`);
const pois = [
  { name: 'vila', x: 0, z: 0 },
  { name: 'lago', x: 46, z: -24 }, // beira do lago (R2 termina aqui)
  { name: 'fazenda', x: -55, z: 32 }, // portão (R4 termina aqui)
  { name: 'floresta', x: 44, z: 34 }, // R3 termina na borda
  { name: 'arco-íris', x: 24, z: -24 }
];
for (const p of pois) {
  const d = distToRoad(p.x, p.z, allRoadPts);
  if (d > 8) issues.push(`POI ${p.name} (${p.x},${p.z}) is ${d.toFixed(2)} m from the nearest road (need ≤ 8)`);
}

// ---- 7. animals: roads, water, pen ----
const pen = VALLEY_FARM;
for (const a of layout.animals) {
  const dRoad = distToRoad(a.x, a.z, allRoadPts);
  if (dRoad < 3.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): ${dRoad.toFixed(2)} m from road (need ≥ 3)`);
  const dLake = Math.hypot(a.x - VALLEY_LAKE.x, a.z - VALLEY_LAKE.z);
  if (dLake < VALLEY_LAKE.r + 1.0) issues.push(`animal ${a.type}(${a.x.toFixed(1)},${a.z.toFixed(1)}): inside the lake rim`);
}
{
  const inPen = (a) =>
    a.x >= pen.cx - pen.half - 0.3 && a.x <= pen.cx + pen.half + 0.3 && a.z >= pen.cz - pen.half - 0.3 && a.z <= pen.cz + pen.half + 0.3;
  const penAnimals = layout.animals.filter(inPen).length;
  if (penAnimals !== 6) issues.push(`expected 6 animals inside the fenced pen, found ${penAnimals}`);
}

// ---- 8. ducks: lake shore band [r, r+1.6] ----
for (const d of layout.ducks) {
  const dist = Math.hypot(d.x - VALLEY_LAKE.x, d.z - VALLEY_LAKE.z);
  if (dist < VALLEY_LAKE.r || dist > VALLEY_LAKE.r + 1.6) {
    issues.push(`duck(${d.x.toFixed(1)},${d.z.toFixed(1)}): ${dist.toFixed(2)} from lake center — need shore band [${VALLEY_LAKE.r}, ${VALLEY_LAKE.r + 1.6}]`);
  }
}

// ---- 9. lamps: beside a road, clear of solids ----
for (const l of layout.lamps) {
  const d = distToRoad(l.x, l.z, allRoadPts);
  if (d < 2.0 || d > 5.0) issues.push(`lamp(${l.x},${l.z}): ${d.toFixed(2)} m from road (need 2..5)`);
  for (const s of solids) {
    const dd = Math.hypot(l.x - s.x, l.z - s.z);
    if (dd < s.r + 0.6) issues.push(`lamp(${l.x},${l.z}) is ${dd.toFixed(2)} from ${s.kind} r=${s.r.toFixed(2)} (need ≥ ${(s.r + 0.6).toFixed(1)})`);
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
    minClear = Math.min(minClear, p.y - valleyTerrainHeight(p.x, p.z));
  }
  if (minY < 3.2 - 0.5) issues.push(`flight tour dips to y=${minY.toFixed(2)} (band [3.2, 26] tol 0.5)`);
  if (maxY > 26 + 0.5) issues.push(`flight tour climbs to y=${maxY.toFixed(2)} (band [3.2, 26] tol 0.5)`);
  if (minClear < 1.5) issues.push(`flight tour terrain clearance ${minClear.toFixed(2)} < 1.5`);
  // Waypoint↔POI consistency (the two meadow waypoints are scenery passes).
  const checks = [
    { wp: [0, 11, 2], poi: [0, 0], name: 'vila', tol: 8 },
    { wp: [50, 14, -30], poi: [46, -24], name: 'lago', tol: 8 },
    { wp: [56, 14, 48], poi: [VALLEY_FOREST.x, VALLEY_FOREST.z], name: 'floresta', tol: 20 },
    { wp: [-64, 14, 34], poi: [VALLEY_FARM.cx, VALLEY_FARM.cz], name: 'fazenda', tol: 12 }
  ];
  for (const c of checks) {
    const d = Math.hypot(c.wp[0] - c.poi[0], c.wp[2] - c.poi[1]);
    if (d > c.tol) issues.push(`flight waypoint over ${c.name} is ${d.toFixed(1)} m from the POI (need ≤ ${c.tol})`);
  }
  const hasRainbow = FLIGHT_WAYPOINTS.some((w) => w[0] === RAINBOW[0] && w[1] === RAINBOW[1] && w[2] === RAINBOW[2]);
  if (!hasRainbow) issues.push('flight tour waypoints do not include the rainbow point [24,10,-24]');
}

// ---- 11. no Math.random in the pure layout ----
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/world/valleyLayout.ts', import.meta.url), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/\bMath\.random\s*\(/.test(line)) issues.push(`valleyLayout.ts:${i + 1}: Math.random used for placement`);
    if (/\brand\s*\(/.test(line)) issues.push(`valleyLayout.ts:${i + 1}: rand() used for placement`);
  });
}

// ---- 12. solid-solid sanity (layout self-consistency) ----
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
const treeCount = {};
for (const t of layout.trees) treeCount[t.kind] = (treeCount[t.kind] ?? 0) + 1;
console.log(
  `layout: seed=${layout.seed} houses=${layout.houses.length} trees=${layout.trees.length} ` +
    `(pine=${treeCount.pine ?? 0} tree=${treeCount.tree ?? 0} appletree=${treeCount.appletree ?? 0}) ` +
    `animals=${layout.animals.length} lamps=${layout.lamps.length} benches=${layout.benches.length} ` +
    `fencePosts=${layout.fencePosts.length} bushes=${layout.bushes.length} flowers=${layout.flowers.length} ` +
    `solids=${solids.length} roadPts=${allRoadPts.length} animalsByType=${JSON.stringify(animalCount)}`
);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const i of issues) console.error(' - ' + i);
  process.exit(1);
} else {
  console.log('OK: all structural checks passed.');
}
