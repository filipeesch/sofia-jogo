// Structural auto-check for the "sobre trilhos" (on-rails) tours.
// Runs in Node (type-stripped TS imports; the rails modules import the pure
// layout modules with explicit .ts extensions, which Node resolves).
//
//   node scripts/check-rail-tour.mjs
//
// Car tour checks (per world):
//   1. closed, finite, rides the terrain
//   2. stays on the road (within 2.0 m of a centerline; offset pass <= 1.35 m)
//   3. drives EVERY road (samples off the tour are only allowed in the
//      <= 6 m zone around a dead-end U-turn)
//   4. clears every deterministic solid by the car's collision margin (r + 1.2)
// Flight tour checks (per world):
//   5. closed, finite, altitude band, terrain clearance, horizontal extent
//   6. passes over the rainbow arch (where present) and every POI waypoint
// Plus a PathFollower smoke test on the valley car tour.
import * as THREE from 'three';
import { buildRoadTour, sampleRoadDef } from '../src/rails/roadTour.ts';
import { flightTourPoints, flightTourWaypoints } from '../src/rails/flightTour.ts';
import { PathFollower } from '../src/rails/pathFollower.ts';
import { ROAD_DEFS } from '../src/rails/roadDefs.ts';
import { mountainTerrainHeight, buildMountainsLayout, layoutSolids as mountainLayoutSolids } from '../src/world/mountainsLayout.ts';
import { islandTerrainHeight, buildIslandLayout, layoutSolids as islandLayoutSolids } from '../src/world/islandLayout.ts';

const issues = [];

// ---- generic 2D helpers ----
function distToPolyline2D(x, z, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i];
    const [ex, ez] = poly[i + 1];
    const dx = ex - ax;
    const dz = ez - az;
    const len2 = dx * dx + dz * dz;
    let t = 0;
    if (len2 > 1e-9) t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

// Hill/dune terrain: sum of flattened hemisphere bumps (same math as the
// Snow / Desert / Valley terrainHeight methods).
function hillTerrain(hills) {
  return (x, z) => {
    let h = 0;
    for (const [hx, hz, r, hh] of hills) {
      const n = Math.hypot(x - hx, z - hz) / r;
      if (n < 1) h += hh * Math.sqrt(Math.max(0, 1 - n * n));
    }
    return h;
  };
}

// ---- deterministic per-world terrain + collision solids ----
// (mirror of src/world/Snow.ts, Desert.ts, Valley.ts — fixed object lists;
//  random-scaled trees/cacti use their worst-case radius; the random valley
//  forest trees and the scattered animals are not reproducible in Node and
//  are dodged at runtime by the tour's lateral-offset pass instead.)
const VALLEY_HILLS = [[-30, -28, 22, 3.5], [24, 50, 18, 3.0], [-58, -18, 20, 3.2], [38, 8, 16, 2.6]];
const SNOW_HILLS = [[10, 6, 6, 2.0], [-16, 8, 7, 2.4], [4, -18, 5, 1.6], [18, -8, 6, 2.0], [-10, -12, 5, 1.7], [22, 6, 5, 1.8]];
const DESERT_DUNES = [[8, -6, 7, 2.2], [-14, 6, 8, 2.6], [16, 12, 6, 2.0], [-6, -16, 7, 2.4], [-18, -14, 6, 2.0], [28, -20, 7, 2.4]];

function valleySolids() {
  const out = [];
  for (const [x, z] of [[8, 8], [-8, 10], [4, -10], [-10, -6]]) out.push({ x, z, r: 1.9, kind: 'house' });
  for (const [x, z] of [[44, -22], [58, -26], [50, -40]]) out.push({ x, z, r: 1.0, kind: 'bench' });
  out.push({ x: -66, z: 22, r: 2.3, kind: 'barn' });
  const size = 14;
  const gates = [[-46, 25], [-65, 44], [-62, 44]];
  for (let i = -size; i <= size; i += 3) {
    for (const [sx, sz] of [[i, -size], [i, size], [-size, i], [size, i]]) {
      const fx = -60 + sx, fz = 30 + sz;
      if (gates.some(([gx, gz]) => gx === fx && gz === fz)) continue;
      out.push({ x: fx, z: fz, r: 0.4, kind: 'fence' });
    }
  }
  for (const [x, z] of [[-60, 22], [-56, 38], [-48, 22], [-52, 40], [-64, 30], [-58, 18], [-78, 28], [-70, 50]]) {
    out.push({ x, z, r: 1.0, kind: 'animal' });
  }
  return out;
}

function snowSolids() {
  const out = [{ x: 0, z: -21, r: 1.9, kind: 'cabin' }];
  for (const [x, z] of [[2, 6], [-14, -4], [0, 21], [-4, 19], [10, -10]]) out.push({ x, z, r: 1.6, kind: 'snowman' });
  const pines = [[-22, 6], [8, -8], [22, 10], [-26, 4], [-6, -22], [26, -8], [-24, 22], [4, 22], [24, -22], [10, 5], [-12, 22], [24, -8], [-24, 10], [12, 24]];
  for (const [x, z] of pines) out.push({ x, z, r: 1.2 * 1.3, kind: 'pine' }); // worst-case scale
  return out;
}

function desertSolids() {
  const out = [
    { x: 8, z: 6, r: 1.9, kind: 'house' },
    { x: 10, z: -8, r: 4.5, kind: 'pyramid' }
  ];
  const cacti = [[-4, -6], [4, -4], [24, 22], [-24, -6], [-6, -22], [22, -4], [4, 22], [22, 6], [-12, 20], [2, 8], [-12, -8], [10, -22], [-24, 20], [24, 10]];
  for (const [x, z] of cacti) out.push({ x, z, r: 0.9 * 1.4, kind: 'cactus' }); // worst-case scale
  return out;
}

const WORLD_CAR = [
  { world: 'valley', kind: 'valley', terrain: hillTerrain(VALLEY_HILLS), solids: valleySolids() },
  { world: 'snow', kind: 'grid', terrain: hillTerrain(SNOW_HILLS), solids: snowSolids() },
  { world: 'desert', kind: 'grid', terrain: hillTerrain(DESERT_DUNES), solids: desertSolids() },
  {
    world: 'mountains',
    kind: 'mountains',
    terrain: mountainTerrainHeight,
    solids: mountainLayoutSolids(buildMountainsLayout())
  },
  {
    world: 'island',
    kind: 'island',
    terrain: islandTerrainHeight,
    solids: islandLayoutSolids(buildIslandLayout())
  }
];

const CAR_MARGIN = 1.2; // car collision clearance beyond the solid radius
const ON_ROAD_EPS = 2.0; // tour stays on the road (offset pass <= 1.35 m)
const COVER_EPS = 1.6; // road samples must be on the tour...
const UTURN_EPS = 6.0; // ...unless inside the dead-end U-turn backoff zone

for (const w of WORLD_CAR) {
  const defs = ROAD_DEFS[w.kind];
  const tour = buildRoadTour(defs, w.terrain, 0, 20, { solids: w.solids });
  const pts = tour.points;
  const fail = (m) => issues.push(w.world + ': ' + m);

  // 1. closed, finite
  if (!pts.length || pts.length < 50) fail('tour too short (' + pts.length + ' pts)');
  if (!pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))) fail('tour has non-finite points');
  // The tour is cyclic: the last wrap segment connects back to the first
  // point. Both sit at the start node, possibly projected onto two different
  // roads, so allow up to ~3 m for the closing gap.
  const closeGap = pts.length ? pts[pts.length - 1].distanceTo(pts[0]) : Infinity;
  if (closeGap >= 3.0) fail('tour not closed: gap ' + closeGap.toFixed(2) + ' m');
  if (!(tour.totalLength > 0 && tour.totalLength < 5000)) fail('totalLength implausible: ' + tour.totalLength.toFixed(1) + ' m');

  // 3. rides the terrain
  const offTerrain = pts.reduce((m, p) => Math.max(m, Math.abs(p.y - w.terrain(p.x, p.z))), 0);
  if (offTerrain >= 1e-6) fail('tour off terrain by ' + offTerrain.toFixed(4) + ' m');

  // 2. stays on the road
  const centerlines = defs.map((d) => sampleRoadDef(d));
  const tourPoly = pts.map((p) => [p.x, p.z]);
  const offRoadAt = (x, z) => centerlines.reduce((m, c) => Math.min(m, distToPolyline2D(x, z, c)), Infinity);
  const maxOffRoad = pts.reduce((m, p) => Math.max(m, offRoadAt(p.x, p.z)), 0);
  if (maxOffRoad > ON_ROAD_EPS) fail('tour leaves the road (max ' + maxOffRoad.toFixed(2) + ' m from centerline)');

  // 3. drives every road (U-turn backoff zones are exempt)
  let uncovered = 0;
  let worstCover = 0;
  let worstCoverPt = null;
  for (const def of defs) {
    for (const [x, z] of sampleRoadDef(def)) {
      const d = distToPolyline2D(x, z, tourPoly);
      if (d <= COVER_EPS) continue;
      const nearUTurn = tour.uTurns.some((u) => Math.hypot(x - u.x, z - u.z) <= UTURN_EPS);
      if (!nearUTurn) {
        uncovered++;
        if (d > worstCover) {
          worstCover = d;
          worstCoverPt = [x, z];
        }
      }
    }
  }
  if (uncovered > 0) fail('road not covered: ' + uncovered + ' samples off tour, worst ' + worstCover.toFixed(2) + ' m at (' + worstCoverPt[0].toFixed(1) + ',' + worstCoverPt[1].toFixed(1) + ')');

  // 4. clears the deterministic solids
  let minMargin = Infinity;
  let worstSolid = null;
  for (const s of w.solids) {
    let best = Infinity;
    for (const p of pts) best = Math.min(best, Math.hypot(p.x - s.x, p.z - s.z));
    const margin = best - (s.r + CAR_MARGIN);
    if (margin < minMargin) {
      minMargin = margin;
      worstSolid = s;
    }
  }
  if (minMargin < 0) fail('tour collides with ' + worstSolid.kind + '(' + worstSolid.x + ',' + worstSolid.z + '): margin ' + minMargin.toFixed(2) + ' m');

  const networkLen = centerlines.reduce((sum, c) => {
    let l = 0;
    for (let i = 1; i < c.length; i++) l += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
    return sum + l;
  }, 0);
  const anyIssue = issues.some((i) => i.startsWith(w.world + ':'));
  console.log(
    '  car ' + w.world.padEnd(9) +
    ' pts=' + String(pts.length).padStart(4) +
    ' tour=' + tour.totalLength.toFixed(0).padStart(5) + ' m ' +
    '(network ' + networkLen.toFixed(0) + ' m, x' + (tour.totalLength / networkLen).toFixed(2) + ') ' +
    'offRoad=' + maxOffRoad.toFixed(2) + ' minMargin=' + minMargin.toFixed(2) +
    ' uTurns=' + tour.uTurns.length + ' ' + (anyIssue ? 'FAIL' : 'ok')
  );
}

// ---- flight tours ----
const WORLD_FLIGHT = [
  { world: 'valley', terrain: hillTerrain(VALLEY_HILLS), rainbow: true },
  { world: 'mountains', terrain: mountainTerrainHeight, rainbow: true },
  { world: 'island', terrain: islandTerrainHeight, rainbow: false },
  { world: 'snow', terrain: hillTerrain(SNOW_HILLS), rainbow: true },
  { world: 'desert', terrain: hillTerrain(DESERT_DUNES), rainbow: true }
];

for (const w of WORLD_FLIGHT) {
  const pts = flightTourPoints(w.world);
  const wp = flightTourWaypoints(w.world);
  const fail = (m) => issues.push('flight ' + w.world + ': ' + m);

  if (pts.length !== 240) {
    fail('expected 240 points, got ' + pts.length);
    continue;
  }
  if (!pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))) fail('non-finite points');
  // Cyclic by construction: the closing gap is one 1/240th arc segment.
  let flightTotal = 0;
  for (let i = 0; i < pts.length; i++) flightTotal += pts[i].distanceTo(pts[(i + 1) % pts.length]);
  const gap = pts[pts.length - 1].distanceTo(pts[0]);
  if (gap > (flightTotal / pts.length) * 1.5 + 0.5) fail('tour not closed: gap ' + gap.toFixed(2) + ' m');

  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  if (minY < 2.9 || maxY > 30.5) fail('altitude band violated: [' + minY.toFixed(1) + ', ' + maxY.toFixed(1) + ']');

  let minClear = Infinity;
  for (const p of pts) minClear = Math.min(minClear, p.y - w.terrain(p.x, p.z));
  if (minClear < 2.5) fail('terrain clearance ' + minClear.toFixed(2) + ' m < 2.5 m');

  const maxR = Math.max(...pts.map((p) => Math.hypot(p.x, p.z)));
  if (maxR > 140) fail('horizontal extent ' + maxR.toFixed(1) + ' m > 140 m');

  if (w.rainbow) {
    const dRainbow = Math.min(...pts.map((p) => Math.hypot(p.x - 24, p.y - 10, p.z + 24)));
    if (dRainbow >= 3) fail('rainbow pass missed: ' + dRainbow.toFixed(2) + ' m from arch center');
  }

  let worstWp = 0;
  for (const [x, y, z] of wp) {
    const d = Math.min(...pts.map((p) => p.distanceTo(new THREE.Vector3(x, y, z))));
    if (d > worstWp) worstWp = d;
    if (d > 2.5) fail('waypoint (' + x + ',' + y + ',' + z + ') missed by ' + d.toFixed(2) + ' m');
  }

  const anyIssue = issues.some((i) => i.startsWith('flight ' + w.world + ':'));
  console.log(
    '  flight ' + w.world.padEnd(9) +
    ' y=[' + minY.toFixed(1) + ',' + maxY.toFixed(1) + ']' +
    ' clear=' + minClear.toFixed(2) +
    ' R=' + maxR.toFixed(0) +
    ' wp=' + worstWp.toFixed(2) + ' ' + (anyIssue ? 'FAIL' : 'ok')
  );
}

// ---- PathFollower smoke test (valley car tour) ----
{
  const w = WORLD_CAR[0];
  const tour = buildRoadTour(ROAD_DEFS.valley, w.terrain, 0, 20, { solids: w.solids });
  const f = new PathFollower(tour.points);
  if (Math.abs(f.total - tour.totalLength) >= 1) issues.push('follower: total mismatch (' + f.total.toFixed(1) + ' vs ' + tour.totalLength.toFixed(1) + ')');
  const p0 = f.posAt(new THREE.Vector3());
  if (p0.distanceTo(tour.points[0]) >= 1e-6) issues.push('follower: posAt(0) off by ' + p0.distanceTo(tour.points[0]));
  f.update(f.total / 9, 9); // one full lap at car rail speed
  if (f.s < 0 || f.s >= f.total) issues.push('follower: s out of range after lap: ' + f.s);
  const fwd = f.getForward();
  if (Math.abs(fwd.length() - 1) >= 1e-6) issues.push('follower: forward not unit: ' + fwd.length());
  const sN = f.nearest(0, 20);
  if (sN < 0 || sN >= f.total) issues.push('follower: nearest out of range: ' + sN);
  console.log('  follower  valley total=' + f.total.toFixed(0) + ' m lap-wrap ok');
}

// ---- summary ----
console.log();
if (issues.length) {
  for (const i of issues) console.log('  * ' + i);
  console.log('FAIL: ' + issues.length + ' issue(s)');
  process.exit(1);
} else {
  console.log('PASS: all on-rails tours validated');
}

