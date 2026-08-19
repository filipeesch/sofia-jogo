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
//   - VILA: 5 cabins around the hub, facing their road (band 5.1..8.1 m).
//   - LAGO: (-38,-30) r 11 — ring road passes the NE shore; ducks on the
//     west/south shore band [r, r+1.6].
//   - POÇO: (14,-46) r 4.5 — small meadow pond on the north ring; 2 ducks,
//     a bench on the shore.
//   - FAZENDA: pen 14x14 at (-30,20) inside the west ring; barn (-14,38)
//     beside the road; dogs by the barn, cows grazing.
//   - PINHEIRAL: pine ring around (56,30), r 14..36; the east ring reaches
//     the clearing (46,22) and curves back north.
//   - Picos nevados: ring of 8 peaks, r ≈ 96-99 from the center.
//   - 4 snowmen on peak slopes facing the valley.
//   - 4 soft hills for a varied horizon.
//
// Roads (skill rules 6-8): the network is a union of TWO CLOSED RINGS that
// share the village hub (0,6) — no dead ends, every endpoint is shared with
// another road, deflections ≤ 60°:
//   Ring west (vila → fazenda → lago → vila): R1 + R2.
//   Ring east (vila → clareira → norte/poço → vila): R3 + R4.

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
// Two closed rings sharing the village hub (0,6) — skill rule 6 (union of
// closed rings, no dead ends) and rule 7 (deflection ≤ 60°):
//   * Ring west: vila → fazenda (passes the pen south side) → lago (NE shore)
//     → vila.
//   * Ring east: vila → clareira do pinheiral → norte (poço + mirante) → vila.
// No road crosses the lake or the pond; all stay on the flat valley floor.
export const MOUNTAINS_ROADS: [number, number][][] = [
  // R1 (west ring, out): vila → spawn (0,20) → fazenda → lago NE shore
  [[0, 6], [0, 20], [-10, 28], [-22, 34], [-34, 36], [-44, 30], [-50, 18], [-50, 4], [-46, -8], [-42, -14], [-38, -16]],
  // R2 (west ring, back): lago NE shore → vila
  [[-38, -16], [-28, -14], [-18, -10], [-8, -4], [0, 6]],
  // R3 (east ring, out): vila → clareira do pinheiral
  [[0, 6], [16, 10], [30, 16], [40, 20], [46, 22]],
  // R4 (east ring, back): clareira → norte (poço/mirante) → vila
  [[46, 22], [50, 19], [50, 10], [46, 2], [38, -8], [28, -18], [18, -28], [10, -36], [4, -40], [-3, -39], [-6, -34], [-4, -22], [0, -12], [0, 6]]
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

// 5 cabins, all beside a road (band [5.1, 8.1] m from the centerline).
// H1/H2: village hub (rings meet). H3: on the east ring return. H4: on the
// west ring return. H5: on the west ring near the hub.
export const MOUNTAINS_HOUSES: PlacedHouse[] = [
  { x: 12, z: 16, rotY: faceToward(12, 16, 13.6, 9.4), colorIndex: 0 }, // L da R3
  { x: -7, z: 11, rotY: faceToward(-7, 11, 0, 11), colorIndex: 1 }, // L da R1
  { x: 7, z: -13, rotY: faceToward(7, -13, 0, -12), colorIndex: 2 }, // R da R4
  { x: -14, z: -2, rotY: faceToward(-14, -2, -8, -4), colorIndex: 3 }, // R da R2
  { x: 4, z: 26, rotY: faceToward(4, 26, -0.5, 20.4), colorIndex: 4 } // L da R1
];

export const MOUNTAINS_LAMPS: [number, number][] = [
  [4, 14], // vila / R1 leste
  [-3, 14], // vila / R1 oeste
  [18, 14], // R3 (saída da vila)
  [2, 22], // R1 (entre a vila e a fazenda)
  [-28, 31], // R1, perto da fazenda
  [-46, 32], // R1, campo oeste
  [-30, -18], // R2, margem NE do lago
  [-54, 12], // R1, extremo oeste
  [10, -40], // R4, perto do poço
  [3, -8] // R4, retorno norte (vila)
];

// Benches: one at the lake shore, one at the north overlook (mirante), one
// on the pond shore — each looking at something worth looking at.
export interface PlacedBench {
  x: number;
  z: number;
  rotY: number;
}

export const MOUNTAINS_BENCHES: PlacedBench[] = [
  { x: -32, z: -20, rotY: faceToward(-32, -20, MOUNTAINS_LAKE.x, MOUNTAINS_LAKE.z) },
  { x: 6, z: -34, rotY: faceToward(6, -34, 0, -80) }, // mirante, olhando os picos
  { x: 10, z: -42, rotY: faceToward(10, -42, MOUNTAINS_POND.x, MOUNTAINS_POND.z) } // poço
];

// Farm: pen 14x14 (fence half = 7 around (-30,20)); barn south-east of the
// pen, beside the west ring road.
export const MOUNTAINS_FENCE = { cx: -30, cz: 20, half: 7, step: 3.5 };
export const MOUNTAINS_BARN = { x: -14, z: 38 };

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
// 32 animals (skill rule 17: ≥ 30). Every animal lives in its habitat — pen
// (fenced, wanderR ≤ 4, anchor ≥ 5 m from the fence, grid ≥ 3 m), barn dogs,
// grazing cows, village cats/chickens, meadow sheep, and ducks on the water's
// edge band [r, r+1.6]. Wander circles are kept clear of roads/water/solids.
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

export const MOUNTAINS_ANIMALS: PlacedAnimal[] = [
  // Curral (fazenda): dentro do cercado (half 7 → âncoras a ≤ 2 do centro,
  // ≥ 5 m da cerca, grade ≥ 3 m entre animais)
  { type: 'sheep', x: -31.5, z: 18.5, wanderR: 4 },
  { type: 'sheep', x: -28.5, z: 21.5, wanderR: 4 },
  { type: 'chicken', x: -28.5, z: 18.5, wanderR: 3 },
  { type: 'chicken', x: -31.5, z: 21.5, wanderR: 3 },
  // Fazenda: cachorros perto do celeiro, vacas pastando fora do cercado
  { type: 'dog', x: -10, z: 46, wanderR: 3 },
  { type: 'dog', x: -18, z: 46, wanderR: 3 },
  { type: 'cow', x: -24, z: 46, wanderR: 4 },
  { type: 'cow', x: -40, z: 42, wanderR: 4 },
  { type: 'cow', x: -42, z: 20, wanderR: 4 },
  // Vila
  { type: 'cat', x: -6, z: 18, wanderR: 3 },
  { type: 'cat', x: 16, z: 2, wanderR: 3 },
  { type: 'chicken', x: 12, z: 26, wanderR: 2.5 },
  { type: 'chicken', x: 20, z: 22, wanderR: 2.5 },
  { type: 'chicken', x: 20, z: 4, wanderR: 2.5 },
  { type: 'chicken', x: -18, z: 24, wanderR: 2.5 },
  { type: 'chicken', x: 10, z: 30, wanderR: 2.5 },
  // Campos
  { type: 'sheep', x: -16, z: 16, wanderR: 5 },
  { type: 'sheep', x: 26, z: 4, wanderR: 5 },
  { type: 'sheep', x: 24, z: 22, wanderR: 5 },
  { type: 'sheep', x: -34, z: 6, wanderR: 5 },
  { type: 'sheep', x: 36, z: 6, wanderR: 5 },
  { type: 'cow', x: 32, z: -4, wanderR: 4 },
  { type: 'cow', x: -38, z: -4, wanderR: 4 },
  // Norte (mirante / poço)
  { type: 'sheep', x: 8, z: -24, wanderR: 5 },
  { type: 'sheep', x: -16, z: -28, wanderR: 5 },
  // Patos na margem (faixa [r, r+1.6] de uma água; sem solid de colisão)
  { type: 'duck', x: -30, z: -39, wanderR: 1.5 },
  { type: 'duck', x: -44, z: -40, wanderR: 1.5 },
  { type: 'duck', x: -49, z: -32, wanderR: 1.5 },
  { type: 'duck', x: -33, z: -41, wanderR: 1.5 },
  { type: 'duck', x: 19, z: -46, wanderR: 1.5 },
  { type: 'duck', x: 17, z: -51, wanderR: 1.5 }
];

// ---------- L3: vegetation ----------

// A few trees on the open meadow (rest between the dense zones).
export const MOUNTAINS_MEADOW_TREES: { x: number; z: number; pine: boolean }[] = [
  { x: 18, z: -6, pine: true },
  { x: -18, z: -20, pine: false },
  { x: 24, z: -36, pine: true }, // norte, longe da R4
  { x: -24, z: -40, pine: false },
  { x: 40, z: -22, pine: true }, // leste, longe da R4
  { x: -20, z: -36, pine: false },
  { x: 8, z: 36, pine: true },
  { x: -52, z: -18, pine: false } // oeste, longe da R1a
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
  barn?: PlacedPoint; // optional: data-driven levels (editor) may omit the barn
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
  if (layout.barn) out.push({ x: layout.barn.x, z: layout.barn.z, r: 2.3, clearance: 0.8, kind: 'barn' });
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
