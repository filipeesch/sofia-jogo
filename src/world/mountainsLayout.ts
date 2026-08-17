// Pure, deterministic layout for "Vale das Montanhas" (worldType 'mountains').
//
// This module is intentionally free of THREE: it only computes data (zones,
// road control points, placed objects, collision solids), so
// scripts/check-mountain-level.mjs can import it in Node and validate the
// level (skill rule 12: seed + fixed L0→L4 order, same seed = same level).
//
// Scale: the valley is ~5x the original in useful area (linear factor ~2.2).
// Content lives within r≈80 of the hub; the ring of snowy peaks sits at
// r≈98, framing a big open valley. Elements are spaced generously.
//
// Zones (x/z, valley floor is flat at y=0; hub at (0,6)):
//   - MAIN ROAD: spawn (0,54) → village hub (0,6).
//   - VILA: 5 cabins around the hub and along the main road, facing their road.
//   - LAGO: (-38,-30) r 11 — the west road ends on the NE shore.
//   - POÇO: (14,-46) r 4.5 — small meadow pond on the north road.
//   - FAZENDA: pen 14x14 at (-30,20) inside the farm loop (roads R4+R6);
//     barn (-14,48) south of the pen; dog by the barn, cows grazing.
//   - PINHEIRAL: pine ring around (56,30), r 14..36; road ends in the clearing.
//   - Picos nevados: ring of 8 peaks, r ≈ 96-99 from the center.
//   - 4 snowmen on peak slopes facing the valley.
//   - 4 soft hills for a varied horizon.

export const TAU = Math.PI * 2;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(a ^ (t >>> 7), 61 | t)) ^ t;
    return ((t + (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- L0: terrain / zones ----------

export const MOUNTAIN_SEED = 20240517;

export interface PeakDef {
  a: number; // angle (deg)
  r: number; // distance of the peak center from the origin
  rad: number; // base radius (solid + terrain profile)
  h: number; // height
}

export const MOUNTAINS_PEAKS: PeakDef[] = [
  { a: 0, r: 98, rad: 24, h: 30 },
  { a: 45, r: 96, rad: 25, h: 34 },
  { a: 90, r: 99, rad: 24, h: 32 },
  { a: 135, r: 97, rad: 25, h: 35 },
  { a: 180, r: 99, rad: 24, h: 31 },
  { a: 225, r: 96, rad: 25, h: 33 },
  { a: 270, r: 98, rad: 24, h: 30 },
  { a: 315, r: 97, rad: 25, h: 33 }
];

export const MOUNTAINS_HILLS = [
  { x: 31, z: -35, r: 13, h: 4.0 },
  { x: -9, z: -57, r: 11, h: 3.5 },
  { x: 36, z: 58, r: 12, h: 3.5 },
  { x: -48, z: -42, r: 11, h: 3.5 }
];

export const MOUNTAINS_LAKE = { x: -38, z: -30, r: 11 };
export const MOUNTAINS_POND = { x: 14, z: -46, r: 4.5 };
/** Every water body in the valley (road clearance, duck shores, auto-check). */
export const MOUNTAINS_WATERS = [MOUNTAINS_LAKE, MOUNTAINS_POND];

// Dense pine ring (the "pinheiral"). No houses inside.
export const MOUNTAINS_FOREST = { x: 56, z: 30, inner: 14, outer: 36, count: 42 };

export interface PeakPos {
  x: number;
  z: number;
  rad: number;
  h: number;
}

export function peakPositions(): PeakPos[] {
  return MOUNTAINS_PEAKS.map((p) => {
    const rad = (p.a * Math.PI) / 180;
    return { x: Math.cos(rad) * p.r, z: Math.sin(rad) * p.r, rad: p.rad, h: p.h };
  });
}

// Valley floor height: linear cones for peaks + dome for soft hills.
// Single source of truth, shared by rendering, placement and the auto-check.
export function mountainTerrainHeight(x: number, z: number): number {
  let h = 0;
  for (const p of peakPositions()) {
    const d = Math.hypot(x - p.x, z - p.z);
    const n = d / p.rad;
    if (n < 1) h += p.h * (1 - n);
  }
  for (const hill of MOUNTAINS_HILLS) {
    const d = Math.hypot(x - hill.x, z - hill.z);
    const n = d / hill.r;
    if (n < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - n * n));
  }
  return h;
}

// ---------- L1: roads ----------
// One connected network: the main road links the spawn (0,54) to the village
// hub (0,6); five spokes start at the hub and one loop road (R6) closes the
// farm circuit between the west and SW branches. No road crosses water.
export const MOUNTAINS_ROADS: [number, number][][] = [
  [[0, 54], [0, 30], [0, 6]], // R1 main: spawn → vila
  [[0, 6], [16, 10], [32, 16], [46, 22]], // R2 east: clareira do pinheiral
  [[0, 6], [-14, 0], [-28, -6], [-38, -16]], // R3 west: margem NE do lago
  [[0, 6], [-8, 20], [-20, 32], [-32, 38]], // R4 SW: entrada da fazenda
  [[0, 6], [4, -8], [6, -22], [2, -40]], // R5 norte: mirante do vale
  [[-28, -6], [-44, 4], [-46, 24], [-32, 38]] // R6: anel da fazenda (liga R3 a R4)
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
  for (const road of MOUNTAINS_ROADS) best = Math.min(best, distToPolyline(x, z, road));
  return best;
}

// ---------- L2: anchors ----------

// Cabins face their street: rotation so the house front (+Z) points at the road.
export interface PlacedHouse {
  x: number;
  z: number;
  rotY: number;
  colorIndex: number;
}

function faceToward(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

export const MOUNTAINS_HOUSES: PlacedHouse[] = [
  { x: 7, z: 30, rotY: faceToward(7, 30, 0, 30), colorIndex: 0 }, // L da estrada principal
  { x: -7, z: 42, rotY: faceToward(-7, 42, 0, 42), colorIndex: 1 }, // R da estrada principal
  { x: 12, z: 16, rotY: faceToward(12, 16, 14.5, 9.6), colorIndex: 2 }, // ramal do pinheiral
  { x: -8.3, z: 10.1, rotY: faceToward(-8.3, 10.1, -5.5, 3.6), colorIndex: 3 }, // ramal do lago
  { x: 10, z: -4, rotY: faceToward(10, -4, 3.4, -2.5), colorIndex: 4 } // ramal norte
];

export const MOUNTAINS_LAMPS: [number, number][] = [
  [2.8, 48],
  [-2.8, 48],
  [2.8, 30],
  [-2.8, 30],
  [3.2, 12],
  [-10, 30],
  [8, -10],
  [-5, 1]
];

// Benches: one at the lake shore, one at the north overlook, one in the
// pine clearing — each looking at something worth looking at.
export interface PlacedBench {
  x: number;
  z: number;
  rotY: number;
}

export const MOUNTAINS_BENCHES: PlacedBench[] = [
  { x: -26, z: -24, rotY: faceToward(-26, -24, MOUNTAINS_LAKE.x, MOUNTAINS_LAKE.z) },
  { x: 10, z: -36, rotY: faceToward(10, -36, 8, -80) }, // mirante, olhando os picos
  { x: 40, z: 16, rotY: faceToward(40, 16, MOUNTAINS_FOREST.x, MOUNTAINS_FOREST.z) }
];

// Farm: pen 14x14 (fence half = 7 around (-30,20)); barn south of the pen.
export const MOUNTAINS_FENCE = { cx: -30, cz: 20, half: 7, step: 3.5 };
export const MOUNTAINS_BARN = { x: -14, z: 48 };

export function fencePosts(): { x: number; z: number; rotY: number }[] {
  const { cx, cz, half, step } = MOUNTAINS_FENCE;
  const posts: { x: number; z: number; rotY: number }[] = [];
  for (let i = -half; i <= half; i += step) {
    // N/S lines (run along x): rotY 0
    posts.push({ x: cx + i, z: cz - half, rotY: 0 });
    posts.push({ x: cx + i, z: cz + half, rotY: 0 });
  }
  for (let i = -half + step; i <= half - step; i += step) {
    // E/W lines (run along z): rotY π/2 — corners are shared with the x lines
    posts.push({ x: cx - half, z: cz + i, rotY: Math.PI / 2 });
    posts.push({ x: cx + half, z: cz + i, rotY: Math.PI / 2 });
  }
  return posts;
}

// ---------- L2/L3: animals ----------
// Every animal lives in the meadow or the farm — never on the peaks, never in
// the middle of the lake, never on a road. `wanderR` is the radius of its
// walk area, kept clear of roads/water/solids by the auto-check.
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

export const MOUNTAINS_ANIMALS: PlacedAnimal[] = [
  // Farm: inside the pen (small wander so they stay fenced in)
  { type: 'sheep', x: -30, z: 20, wanderR: 2.5 },
  { type: 'sheep', x: -28, z: 21, wanderR: 2 },
  { type: 'chicken', x: -31, z: 18, wanderR: 1.5 },
  { type: 'chicken', x: -27, z: 18, wanderR: 1.5 },
  // Farm: outside — dog near the barn, cows grazing
  { type: 'cow', x: -10, z: 36, wanderR: 4 },
  { type: 'cow', x: -50, z: 40, wanderR: 4 },
  { type: 'dog', x: -8, z: 54, wanderR: 3 },
  // Village / meadow
  { type: 'cat', x: 12, z: 24, wanderR: 4 },
  { type: 'sheep', x: -8, z: -14, wanderR: 5 },
  { type: 'sheep', x: 22, z: -24, wanderR: 5 },
  { type: 'cow', x: 24, z: -14, wanderR: 5 },
  // Ducks at the water's edge (rule 14 — shore, not open water)
  { type: 'duck', x: -30, z: -39, wanderR: 1.5 },
  { type: 'duck', x: -28, z: -37, wanderR: 1.5 },
  { type: 'duck', x: -32, z: -41, wanderR: 1.5 },
  { type: 'duck', x: 10, z: -50, wanderR: 1.5 }
];

// ---------- L3: vegetation ----------

// A few trees on the open meadow (rest between the dense zones).
export const MOUNTAINS_MEADOW_TREES: { x: number; z: number; pine: boolean }[] = [
  { x: 18, z: -6, pine: true },
  { x: -18, z: -20, pine: false },
  { x: 16, z: -32, pine: true },
  { x: -24, z: -40, pine: false },
  { x: 34, z: -16, pine: true },
  { x: -16, z: -34, pine: false },
  { x: 8, z: 36, pine: true },
  { x: -46, z: -14, pine: false }
];

export const MOUNTAINS_BUSH_COUNT = 40;
export const MOUNTAINS_FLOWER_COUNT = 70;

// ---------- L4: decorations on the peaks ----------

// Snowmen on four visible peak slopes, facing the valley.
export const MOUNTAINS_SNOWMEN = [
  { x: 84.1, z: 0, rotY: faceToward(84.1, 0, 0, 0) }, // slope of the east peak
  { x: 0, z: 84.1, rotY: faceToward(0, 84.1, 0, 0) }, // slope of the south peak
  { x: -84.1, z: 0, rotY: faceToward(-84.1, 0, 0, 0) }, // slope of the west peak
  { x: 0, z: -84.1, rotY: faceToward(0, -84.1, 0, 0) } // slope of the north peak
];

// ---------- Built layout ----------

export interface PlacedTree {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
  pine: boolean;
}

export interface PlacedPoint {
  x: number;
  z: number;
  y: number;
}

export interface MountainsLayout {
  seed: number;
  peaks: PeakPos[];
  waters: { x: number; z: number; r: number }[];
  roads: [number, number][][]; // control polylines (sampled by Roads.ts)
  houses: (PlacedHouse & PlacedPoint)[];
  lamps: PlacedPoint[];
  benches: (PlacedBench & PlacedPoint)[];
  barn: PlacedPoint;
  fencePosts: (PlacedPoint & { rotY: number })[];
  animals: (PlacedAnimal & PlacedPoint)[];
  trees: PlacedTree[];
  bushes: PlacedPoint[];
  flowers: PlacedPoint[];
  snowmen: (PlacedPoint & { rotY: number })[];
}

function placeTree(
  rng: () => number,
  x: number,
  z: number,
  pine: boolean,
  list: PlacedTree[]
): void {
  const scale = 0.9 + rng() * 0.5;
  list.push({ x, z, y: mountainTerrainHeight(x, z), scale, rotY: rng() * TAU, pine });
}

// Obstacles that vegetation must keep clear of (barn, benches, the whole pen).
function vegObstacles(): { x: number; z: number; r: number }[] {
  const out: { x: number; z: number; r: number }[] = [
    { x: MOUNTAINS_BARN.x, z: MOUNTAINS_BARN.z, r: 2.3 },
    ...MOUNTAINS_BENCHES.map((b) => ({ x: b.x, z: b.z, r: 1.0 })),
    ...fencePosts().map((p) => ({ x: p.x, z: p.z, r: 0.4 }))
  ];
  return out;
}

export function buildMountainsLayout(): MountainsLayout {
  const rng = mulberry32(MOUNTAIN_SEED);

  // L2 anchors (fixed, hand-tuned).
  const houses = MOUNTAINS_HOUSES.map((h) => ({ ...h, y: mountainTerrainHeight(h.x, h.z) }));
  const lamps = MOUNTAINS_LAMPS.map(([x, z]) => ({ x, z, y: mountainTerrainHeight(x, z) }));
  const benches = MOUNTAINS_BENCHES.map((b) => ({ ...b, y: mountainTerrainHeight(b.x, b.z) }));
  const barn = { ...MOUNTAINS_BARN, y: mountainTerrainHeight(MOUNTAINS_BARN.x, MOUNTAINS_BARN.z) };
  const fencePostPlacements = fencePosts().map((p) => ({
    ...p,
    y: mountainTerrainHeight(p.x, p.z)
  }));
  const animals = MOUNTAINS_ANIMALS.map((a) => ({ ...a, y: mountainTerrainHeight(a.x, a.z) }));
  const obstacles = vegObstacles();

  // L3 trees. Meadow is fixed; the forest ring is seeded with rejection.
  const trees: PlacedTree[] = [];
  for (const t of MOUNTAINS_MEADOW_TREES) placeTree(rng, t.x, t.z, t.pine, trees);

  const { x: fx, z: fz, inner, outer, count } = MOUNTAINS_FOREST;
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 1600) {
    attempts++;
    const a = rng() * TAU;
    const r = inner + Math.sqrt(rng()) * (outer - inner); // uniform in the annulus
    const x = fx + Math.cos(a) * r;
    const z = fz + Math.sin(a) * r;
    const rad = 1.2 * 1.4; // worst-case tree solid for clearance
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + rad + 0.5) continue; // road + bow margin
    for (const w of MOUNTAINS_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + rad + 0.3) continue;
    }
    for (const h of MOUNTAINS_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + rad + 0.8) continue; // cabins
    }
    let bad = false;
    for (const p of peakPositions()) {
      if (Math.hypot(x - p.x, z - p.z) < p.rad + rad + 0.2) {
        bad = true;
        break;
      }
    }
    if (!bad) {
      for (const hill of MOUNTAINS_HILLS) {
        if (Math.hypot(x - hill.x, z - hill.z) < hill.r + rad + 0.2) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) {
      for (const o of obstacles) {
        if (Math.hypot(x - o.x, z - o.z) < o.r + rad + 0.5) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) {
      // animal wander circles must stay clear of every tree
      for (const an of MOUNTAINS_ANIMALS) {
        if (Math.hypot(x - an.x, z - an.z) < an.wanderR + rad + 0.2) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) {
      // exact spacing between tree solids (scale-dependent)
      for (const t of trees) {
        if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + rad + 0.4) {
          bad = true;
          break;
        }
      }
    }
    if (bad) continue;
    placeTree(rng, x, z, true, trees);
    placed++;
  }

  // Bushes and flowers: meadow patches, clear of roads/water/solids.
  const bushes: PlacedPoint[] = [];
  let attemptsB = 0;
  while (bushes.length < MOUNTAINS_BUSH_COUNT && attemptsB < 900) {
    attemptsB++;
    const a = rng() * TAU;
    const r = 8 + rng() * 42;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.9 + 0.3) continue;
    for (const w of MOUNTAINS_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + 0.9 + 0.3) continue;
    }
    for (const h of MOUNTAINS_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.9 + 0.4) continue; // cabins
    }
    let bad = false;
    for (const o of obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 0.9 + 0.4) {
        bad = true;
        break;
      }
    }
    if (!bad) {
      for (const t of trees) {
        if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + 0.9 + 0.3) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) {
      for (const p of peakPositions()) {
        if (Math.hypot(x - p.x, z - p.z) < p.rad + 0.9 + 0.2) {
          bad = true;
          break;
        }
      }
    }
    if (bad) continue;
    bushes.push({ x, z, y: mountainTerrainHeight(x, z) });
  }

  const flowers: PlacedPoint[] = [];
  let attemptsF = 0;
  while (flowers.length < MOUNTAINS_FLOWER_COUNT && attemptsF < 1400) {
    attemptsF++;
    const a = rng() * TAU;
    const r = 6 + rng() * 49;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.4 + 0.1) continue;
    for (const w of MOUNTAINS_WATERS) {
      if (Math.hypot(x - w.x, z - w.z) < w.r + 0.4 + 0.1) continue;
    }
    for (const h of MOUNTAINS_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.4 + 0.1) continue; // cabins
    }
    let bad = false;
    for (const o of obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 0.4 + 0.1) {
        bad = true;
        break;
      }
    }
    if (!bad) {
      for (const t of trees) {
        if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + 0.4 + 0.1) {
          bad = true;
          break;
        }
      }
    }
    if (bad) continue;
    flowers.push({ x, z, y: mountainTerrainHeight(x, z) });
  }

  const snowmen = MOUNTAINS_SNOWMEN.map((s) => ({
    x: s.x,
    z: s.z,
    y: mountainTerrainHeight(s.x, s.z),
    rotY: s.rotY
  }));

  return {
    seed: MOUNTAIN_SEED,
    peaks: peakPositions(),
    waters: MOUNTAINS_WATERS.map((w) => ({ ...w })),
    roads: MOUNTAINS_ROADS,
    houses,
    lamps,
    benches,
    barn,
    fencePosts: fencePostPlacements,
    animals,
    trees,
    bushes,
    flowers,
    snowmen
  };
}

// Collision solids implied by the layout (shared with the auto-check).
export interface LayoutSolid {
  x: number;
  z: number;
  r: number;
  clearance: number;
  kind: string;
}

export function layoutSolids(layout: MountainsLayout): LayoutSolid[] {
  const out: LayoutSolid[] = [];
  for (const p of layout.peaks) out.push({ x: p.x, z: p.z, r: p.rad, clearance: 0.2, kind: 'peak' });
  for (const h of layout.houses) out.push({ x: h.x, z: h.z, r: 1.9, clearance: 0.8, kind: 'house' });
  out.push({ x: layout.barn.x, z: layout.barn.z, r: 2.3, clearance: 0.8, kind: 'barn' });
  for (const f of layout.fencePosts) out.push({ x: f.x, z: f.z, r: 0.4, clearance: 0.4, kind: 'fence' });
  for (const b of layout.benches) out.push({ x: b.x, z: b.z, r: 1.0, clearance: 0.3, kind: 'bench' });
  for (const l of layout.lamps) out.push({ x: l.x, z: l.z, r: 0.5, clearance: 0.2, kind: 'lamp' });
  for (const s of layout.snowmen) out.push({ x: s.x, z: s.z, r: 0.9, clearance: 0.3, kind: 'snowman' });
  for (const t of layout.trees) out.push({ x: t.x, z: t.z, r: 1.2 * t.scale, clearance: 0.4, kind: 'tree' });
  for (const a of layout.animals) {
    if (a.type !== 'duck') out.push({ x: a.x, z: a.z, r: 1.0, clearance: 0.2, kind: 'animal' });
  }
  return out;
}
