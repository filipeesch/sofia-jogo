// Pure, deterministic layout for "Vale Vivo" (worldType 'valley').
//
// This module is intentionally free of THREE: it only computes data (zones,
// road control points, placed objects, collision solids), so
// scripts/check-valley-level.mjs can import it in Node and validate the level
// (skill rule 12: seed + fixed L0→L4 order, same seed = same level).
//
// Scale: ~5x the original in useful area. Content lives within r≈95 of the
// hub (0,0); soft hills frame the content ring, the valley floor stays flat.
//
// Zones (x/z, valley floor is flat at y=0; hub at (0,0)):
//   - VILA: hub (0,0) + 5 houses, all beside a road (band 5.1..8.1 m).
//   - FAZENDA: 18×18 pen at (-64,34), single gate on the east line (-55,32)
//     where R4 arrives; barn in the yard at (-50,44); 6 animals in the pen.
//   - LAGO: (56,-36) r 13.5 — 3 benches at the shore, 4 ducks in the shore
//     band, animals grazing the near shore.
//   - FLORESTA: (54,48) annulus 8..18 — 55 targeted trees (mix pine/tree/
//     appletree), one chicken in the central clearing.
//   - ARCO-ÍRIS: global arch at x 11..37, z = -24; R2 passes under it.
//   - 18 animals, 18 bushes, 34 flowers, 10 lamps (not solids), 3 benches.
//   - Flight tour: 8 waypoints (see src/rails/flightTour.ts), closed loop.
//
// Roads (5, connected; R1 spawn→hub, R2 hub→lake shore under the arch,
// R3 hub→forest, R4 hub→farm gate, R5 farm gate→forest edge):
//   R1 [[0,26],[0,14],[0,0]]
//   R2 [[0,0],[16,-10],[26,-24],[40,-30],[46,-24]]
//   R3 [[0,0],[18,12],[36,26],[44,34]]
//   R4 [[0,0],[-16,6],[-34,18],[-48,26],[-55,32]]
//   R5 [[-55,32],[-28,48],[6,54],[36,26]]

import type { Solid } from '../utils';

export const TAU = Math.PI * 2;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (a >>> 7), 61 | t)) ^ t;
    return ((t + (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const VALLEY_SEED = 20240415;

// ---------- L0: terrain / zones ----------

export interface HillDef {
  x: number;
  z: number;
  r: number;
  h: number;
}

// 6 soft hills framing the content ring — the village, farm, lake and the
// road network stay on the flat valley floor; only R3 climbs to the forest.
// Hill centers stay within r≈85 of the hub; content stays within r≈95.
export const VALLEY_HILLS: HillDef[] = [
  { x: -52, z: 66, r: 26, h: 2.6 }, // NW of the R5 sweep
  { x: 34, z: 36, r: 28, h: 2.4 }, // below the forest (R3 climbs it)
  { x: 0, z: -85, r: 46, h: 3.6 }, // north rim
  { x: -82, z: -20, r: 34, h: 3.0 }, // west rim
  { x: 84, z: 10, r: 34, h: 2.8 }, // east rim
  { x: 44, z: 70, r: 24, h: 2.4 } // SE rim
];

export const VALLEY_LAKE = { x: 56, z: -36, r: 13.5 };
/** Every water body in the valley (road clearance, duck shores, auto-check). */
export const VALLEY_WATERS = [VALLEY_LAKE];

export const VALLEY_FOREST = { x: 54, z: 48, inner: 8, outer: 18, count: 55 };

// ---------- L1: roads ----------
// One connected network of 5 roads around the hub (0,0). Dead ends: the R1
// spawn end (0,26), the lake shore (46,-24) and the forest edge (44,34) —
// the on-rails car tour does a U-turn at each (see src/rails/roadTour.ts).
// No road crosses the lake. R4 ends exactly at the farm gate (-55,32).
export const VALLEY_ROADS: [number, number][][] = [
  // R1 main: spawn (0,26) → hub (0,0). Car spawns ON this road at (0,20).
  [[0, 26], [0, 14], [0, 0]],
  // R2: hub → SE under the arco-íris → lake shore.
  [[0, 0], [16, -10], [26, -24], [40, -30], [46, -24]],
  // R3: hub → NE to the forest edge (ends at 44,34).
  [[0, 0], [18, 12], [36, 26], [44, 34]],
  // R4: hub → W to the farm gate (-55,32).
  [[0, 0], [-16, 6], [-34, 18], [-48, 26], [-55, 32]],
  // R5: farm gate → N sweep → joins R3 at (36,26).
  [[-55, 32], [-28, 48], [6, 54], [36, 26]]
];

export const ROAD_HALF_WIDTH = 1.7;

// Distance from a point to a control polyline (conservative for the spline).
export function distToPolyline(x: number, z: number, poly: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    let t = 0;
    if (len2 > 1e-9) t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + t * dx;
    const pz = az + t * dz;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}

export function distToAnyRoad(x: number, z: number): number {
  let best = Infinity;
  for (const road of VALLEY_ROADS) best = Math.min(best, distToPolyline(x, z, road));
  return best;
}

// ---------- L2: anchors ----------

// Houses face their street: rotation so the house front (+Z) points at the road.
export interface PlacedHouse {
  x: number;
  z: number;
  rotY: number;
  colorIndex: number;
}

function faceToward(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

// 5 houses, all beside a road (band [5.1, 8.1] m from the centerline).
// H1: east of R1, faces R3. H2: east of R1 south of the hub. H3/H4: west of
// R1. H5: west of R1 north of H4.
export const VALLEY_HOUSES: PlacedHouse[] = [
  { x: 10, z: 16, rotY: faceToward(10, 16, 13, 9), colorIndex: 0 }, // L da R3
  { x: 7, z: 12, rotY: faceToward(7, 12, 0, 12), colorIndex: 1 }, // L da R1
  { x: -7, z: 10, rotY: faceToward(-7, 10, 0, 10), colorIndex: 2 }, // R da R1
  { x: -8, z: 22, rotY: faceToward(-8, 22, 0, 22), colorIndex: 3 }, // R da R1 (norte)
  { x: -7, z: 16, rotY: faceToward(-7, 16, 0, 16), colorIndex: 4 } // R da R1
];

// 10 lamps beside the roads (band ~2..5 m from the centerline). Lamps are NOT
// collision solids — the on-rails tour clears real solids only.
export const VALLEY_LAMPS: [number, number][] = [
  [2.6, 20], // R1 sul
  [-2.6, 14], // R1 (oeste, entre H3 e H4)
  [4.5, 8], // R1/R3 esquina leste
  [-3.2, 6], // R1 oeste do hub
  [11, -3], // R2 campo sul
  [24, -18], // R2 perto do arco-íris
  [38, -26], // R2 perto do lago
  [43, 28], // R3 perto da floresta
  [-26, 10], // R4 campo oeste
  [-50, 24] // R4 entrada da fazenda
];

// 3 benches at the lake shore, facing the water.
export interface PlacedBench {
  x: number;
  z: number;
  rotY: number;
}

export const VALLEY_BENCHES: PlacedBench[] = [
  { x: 42, z: -18, rotY: faceToward(42, -18, VALLEY_LAKE.x, VALLEY_LAKE.z) }, // margem NW
  { x: 71, z: -34, rotY: faceToward(71, -34, VALLEY_LAKE.x, VALLEY_LAKE.z) }, // margem L
  { x: 52, z: -50, rotY: faceToward(52, -50, VALLEY_LAKE.x, VALLEY_LAKE.z) } // margem S
];

// Farm: 18×18 pen (fence half = 9 around (-64,34)); single gate on the EAST
// line at (-55,32) where R4 arrives; barn in the yard just NE of the gate.
export const VALLEY_FARM = { cx: -64, cz: 34, half: 9, step: 3, gate: { x: -55, z: 32 } };
export const VALLEY_BARN = { x: -50, z: 44 };

/**
 * Fence posts: N/S lines (z = cz±half) run the full x range including the
 * corners; E/W lines (x = cx±half) place interior posts only (corners are
 * already covered). The east line leaves a gap at the gate: no post within
 * 3 m of the gate z.
 */
export function farmFencePosts(farm: { cx: number; cz: number; half: number; step: number; gate?: { x: number; z: number } } = VALLEY_FARM): { x: number; z: number; rotY: number }[] {
  const posts: { x: number; z: number; rotY: number }[] = [];
  for (let x = farm.cx - farm.half; x <= farm.cx + farm.half + 0.001; x += farm.step) {
    posts.push({ x, z: farm.cz - farm.half, rotY: 0 });
    posts.push({ x, z: farm.cz + farm.half, rotY: 0 });
  }
  for (let z = farm.cz - farm.half + farm.step; z <= farm.cz + farm.half - farm.step + 0.001; z += farm.step) {
    posts.push({ x: farm.cx - farm.half, z, rotY: Math.PI / 2 });
    // Gate gap on the east line (only when a gate is defined there).
    if (farm.gate && Math.abs(z - farm.gate.z) > 3) {
      posts.push({ x: farm.cx + farm.half, z, rotY: Math.PI / 2 });
    }
  }
  return posts;
}

// ---------- L2/L3: animals ----------
// 18 animals: 4 cows, 4 sheep, 6 chickens, 2 dogs, 2 cats.
// 6 live inside the fenced pen; the rest in the meadow (≥3 m from roads,
// out of the water). Wander radius: 15 for cows/sheep/chickens, 14 for
// dogs/cats.
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

export const VALLEY_ANIMALS: PlacedAnimal[] = [
  // Pen (inside the fence: x -73..-55, z 25..43). Small wander radius: the
  // pen animals stay inside the fence (they have no collision, so the radius
  // is the fence).
  { type: 'cow', x: -68, z: 31, wanderR: 4 },
  { type: 'cow', x: -60, z: 37, wanderR: 4 },
  { type: 'sheep', x: -68, z: 37, wanderR: 4 },
  { type: 'sheep', x: -60, z: 30, wanderR: 4 },
  { type: 'chicken', x: -64, z: 34, wanderR: 4 },
  { type: 'chicken', x: -62, z: 32, wanderR: 4 },
  // Yard (barn area, outside the fence)
  { type: 'dog', x: -50, z: 40, wanderR: 14 },
  { type: 'cat', x: -66, z: 46, wanderR: 14 },
  // Village meadow
  { type: 'dog', x: 12, z: 22, wanderR: 14 },
  { type: 'cat', x: -12, z: 22, wanderR: 14 },
  { type: 'chicken', x: 12, z: -12, wanderR: 15 },
  { type: 'chicken', x: -14, z: -4, wanderR: 15 },
  { type: 'sheep', x: 16, z: 4, wanderR: 15 },
  { type: 'sheep', x: -16, z: -10, wanderR: 15 },
  // Lake shore (near side, out of the water)
  { type: 'sheep', x: 34, z: -40, wanderR: 15 },
  { type: 'cow', x: 28, z: -36, wanderR: 15 },
  { type: 'dog', x: 68, z: -48, wanderR: 14 },
  // Forest clearing (center of the annulus)
  { type: 'chicken', x: 48, z: 52, wanderR: 15 }
];

// 4 ducks at the lake shore (band [r, r+1.6]). No solid.
export interface PlacedDuck {
  x: number;
  z: number;
}

export const VALLEY_DUCKS: PlacedDuck[] = [
  { x: 43.5, z: -30 },
  { x: 49.5, z: -48.5 },
  { x: 68, z: -28 },
  { x: 66, z: -47 }
];

// ---------- L3: vegetation ----------

export type TreeKind = 'pine' | 'tree' | 'appletree';

export interface PlacedTree {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
  kind: TreeKind;
}

// ---------- Terrain height ----------
// Single source of truth: sum of hill hemispheres.
export function valleyTerrainHeight(x: number, z: number): number {
  let h = 0;
  for (const hill of VALLEY_HILLS) {
    const d = Math.hypot(x - hill.x, z - hill.z);
    const n = d / hill.r;
    if (n < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - n * n));
  }
  return h;
}

// ---------- Built layout ----------

export interface PlacedPoint {
  x: number;
  z: number;
  y: number;
}

export interface ValleyLayout {
  seed: number;
  hills: HillDef[];
  waters: { x: number; z: number; r: number }[];
  roads: [number, number][][];
  houses: (PlacedHouse & PlacedPoint)[];
  lamps: PlacedPoint[];
  benches: (PlacedBench & PlacedPoint)[];
  farm: typeof VALLEY_FARM;
  barn: PlacedPoint;
  fencePosts: (PlacedPoint & { rotY: number })[];
  animals: (PlacedAnimal & PlacedPoint)[];
  ducks: (PlacedDuck & PlacedPoint)[];
  trees: PlacedTree[];
  bushes: PlacedPoint[];
  flowers: PlacedPoint[];
}

function vegObstacles(): { x: number; z: number; r: number }[] {
  const out: { x: number; z: number; r: number }[] = [
    { x: VALLEY_BARN.x, z: VALLEY_BARN.z, r: 2.3 },
    ...VALLEY_BENCHES.map((b) => ({ x: b.x, z: b.z, r: 1.0 })),
    ...farmFencePosts().map((p) => ({ x: p.x, z: p.z, r: 0.4 })),
    ...VALLEY_HOUSES.map((h) => ({ x: h.x, z: h.z, r: 1.9 }))
  ];
  return out;
}

const TREE_RADIUS_LIMIT = 93; // keep trees comfortably inside the r≈95 content bound

export function buildValleyLayout(): ValleyLayout {
  const rng = mulberry32(VALLEY_SEED);

  // L2 anchors (fixed, hand-tuned).
  const houses = VALLEY_HOUSES.map((h) => ({ ...h, y: valleyTerrainHeight(h.x, h.z) }));
  const lamps = VALLEY_LAMPS.map(([x, z]) => ({ x, z, y: valleyTerrainHeight(x, z) }));
  const benches = VALLEY_BENCHES.map((b) => ({ ...b, y: valleyTerrainHeight(b.x, b.z) }));
  const barn = { ...VALLEY_BARN, y: valleyTerrainHeight(VALLEY_BARN.x, VALLEY_BARN.z) };
  const fencePostPlacements = farmFencePosts().map((p) => ({
    ...p,
    y: valleyTerrainHeight(p.x, p.z)
  }));
  const animals = VALLEY_ANIMALS.map((a) => ({ ...a, y: valleyTerrainHeight(a.x, a.z) }));
  const ducks = VALLEY_DUCKS.map((d) => ({ ...d, y: valleyTerrainHeight(d.x, d.z) }));
  const obstacles = vegObstacles();

  // L3 trees: forest annulus around (54,48) (rejection sampling).
  const rawTrees: { x: number; z: number; y: number; scale: number; rotY: number }[] = [];
  const { x: fx, z: fz, inner, outer, count } = VALLEY_FOREST;
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 4000) {
    attempts++;
    const a = rng() * TAU;
    const r = inner + Math.sqrt(rng()) * (outer - inner);
    const x = fx + Math.cos(a) * r;
    const z = fz + Math.sin(a) * r;
    if (Math.hypot(x, z) > TREE_RADIUS_LIMIT) continue;
    const rad = 1.2 * 1.4; // worst-case tree solid for clearance
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 1.5 + rad) continue;
    for (const w of VALLEY_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + rad + 0.3) continue;
    }
    for (const h of VALLEY_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + rad + 0.8) continue;
    }
    let bad = false;
    for (const o of obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + rad + 0.5) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    for (const an of VALLEY_ANIMALS) {
      // Keep the immediate area around an animal clear; the rest of the grove
      // can stand where the animal wanders through it.
      if (Math.hypot(x - an.x, z - an.z) < an.wanderR * 0.5 + rad + 0.2) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    for (const t of rawTrees) {
      if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + rad + 0.4) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    const scale = 0.9 + rng() * 0.5;
    rawTrees.push({ x, z, y: valleyTerrainHeight(x, z), scale, rotY: rng() * TAU });
    placed++;
  }
  // Deterministic kind mix by placement order: 16 pine / 15 tree / rest apple.
  const trees: PlacedTree[] = rawTrees.map((t, i) => ({
    ...t,
    kind: i < 16 ? 'pine' : i < 31 ? 'tree' : 'appletree'
  }));

  // Bushes: 18 scattered in the fields, clear of roads/water/POIs.
  const bushes: PlacedPoint[] = [];
  let attemptsB = 0;
  while (bushes.length < 18 && attemptsB < 900) {
    attemptsB++;
    const a = rng() * TAU;
    const r = 8 + rng() * 55;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 1.2 + 0.5) continue;
    for (const w of VALLEY_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + 1.2 + 0.3) continue;
    }
    for (const h of VALLEY_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 1.2 + 0.6) continue;
    }
    let bad = false;
    for (const o of obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 1.2 + 0.5) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    for (const t of trees) {
      if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + 1.2 + 0.3) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    bushes.push({ x, z, y: valleyTerrainHeight(x, z) });
  }

  // Flowers: 34 scattered in the fields, clear of roads/water/POIs.
  const flowers: PlacedPoint[] = [];
  let attemptsF = 0;
  while (flowers.length < 34 && attemptsF < 1400) {
    attemptsF++;
    const a = rng() * TAU;
    const r = 6 + rng() * 60;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.4 + 0.1) continue;
    for (const w of VALLEY_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + 0.4 + 0.1) continue;
    }
    for (const h of VALLEY_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.4 + 0.1) continue;
    }
    let bad = false;
    for (const o of obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 0.4 + 0.1) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    for (const t of trees) {
      if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + 0.4 + 0.1) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    flowers.push({ x, z, y: valleyTerrainHeight(x, z) });
  }

  return {
    seed: VALLEY_SEED,
    hills: VALLEY_HILLS,
    waters: VALLEY_WATERS.map((w) => ({ ...w })),
    roads: VALLEY_ROADS,
    houses,
    lamps,
    benches,
    farm: VALLEY_FARM,
    barn,
    fencePosts: fencePostPlacements,
    animals,
    ducks,
    trees,
    bushes,
    flowers
  };
}

// ---------- Solids ----------

// Collision solids implied by the layout (shared with the auto-check and the
// on-rails tour). Lamps, bushes, flowers and ducks are NOT solids: lamps are
// roadside decor, vegetation is low, ducks sit at the water's edge.
export interface LayoutSolid extends Solid {
  kind: string;
}

export function layoutSolids(layout: ValleyLayout): LayoutSolid[] {
  const out: LayoutSolid[] = [];
  for (const h of layout.houses) out.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2, kind: 'house' });
  out.push({ x: layout.barn.x, y: layout.barn.y + 2, z: layout.barn.z, r: 2.3, h: 4, kind: 'barn' });
  for (const f of layout.fencePosts) out.push({ x: f.x, y: f.y + 0.5, z: f.z, r: 0.4, h: 1, kind: 'fence' });
  for (const b of layout.benches) out.push({ x: b.x, y: b.y + 0.5, z: b.z, r: 1.0, h: 1.0, kind: 'bench' });
  for (const a of layout.animals) out.push({ x: a.x, y: a.y + 0.7, z: a.z, r: 1.0, h: 1.4, kind: 'animal' });
  for (const t of layout.trees) out.push({ x: t.x, y: t.y + 2 * t.scale, z: t.z, r: 1.2 * t.scale, h: 4 * t.scale, kind: 'tree' });
  return out;
}
