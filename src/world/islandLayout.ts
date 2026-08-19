// Pure, deterministic layout for "Ilha Feliz" (worldType 'island').
//
// Intentionally free of THREE: it only computes data (zones, road control
// points, placed objects, collision solids), so
// scripts/check-island-level.mjs can import it in Node and validate the level
// (skill rule 12: seed + fixed L0→L4 order, same seed = same level).
//
// Scale: the island is ~5x the original in useful area (radius 34 → 76).
// It is a TROPICAL island: rocky green mountains (no snow, no snowmen —
// that was an inconsistency), a village, a lagoon, a farm, a palm beach and
// a road network. Elements are spaced generously.
//
// Directions: +x east, +z south. Hub (village) near the origin.
//   - PRAIA: south shore, palm grove along the west shore.
//   - LAGOA: (38,20) r 10 — the ring road curves around it; ducks at the edge.
//   - SERRA: rocky mountains (no snow): big (-16,-42), small (34,-26).
//   - FAZENDA: orchard + pen at (-40,14); barn (-54,24) outside.
//   - VILA: 7 houses along the two rings, facing their road.
//   - ESTRADAS: two closed rings (4 polylines, shared nodes — no dead ends),
//     deflections ≤ 60°, following the terrain smoothly.

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

export const ISLAND_SEED = 20240601;

export const ISLAND_RADIUS = 76;
export const ISLAND_PEAK = 4.0; // gentle central mound

export interface MountainDef {
  x: number;
  z: number;
  rad: number; // base radius
  h: number; // height
}

// Rocky, grassy mountains — deliberately NO snow (tropical island).
export const ISLAND_MOUNTAINS: MountainDef[] = [
  { x: -16, z: -42, rad: 16, h: 16 },
  { x: 34, z: -26, rad: 11, h: 10 }
];

export const ISLAND_HILLS = [
  { x: 18, z: 40, r: 11, h: 3.0 },
  { x: -34, z: -12, r: 12, h: 3.4 },
  { x: 40, z: 40, r: 10, h: 2.8 },
  { x: -20, z: 44, r: 11, h: 3.0 },
  { x: 24, z: -44, r: 10, h: 2.8 },
  { x: -46, z: -24, r: 10, h: 2.8 }
];

export const ISLAND_LAGOON = { x: 38, z: 20, r: 10 };

export interface IslandPeakPos {
  x: number;
  z: number;
  rad: number;
  h: number;
}

export function mountainPositions(): IslandPeakPos[] {
  return ISLAND_MOUNTAINS.map((m) => ({ x: m.x, z: m.z, rad: m.rad, h: m.h }));
}

// Island height: central dome + mountain domes + soft hills + lagoon basin.
// Single source of truth, shared by rendering, placement and the auto-check.
export function rawIslandHeight(x: number, z: number): number {
  let h = 0;
  const d = Math.hypot(x, z);
  if (d < ISLAND_RADIUS) {
    const n = d / ISLAND_RADIUS;
    h += ISLAND_PEAK * Math.sqrt(Math.max(0, 1 - n * n));
  }
  for (const m of ISLAND_MOUNTAINS) {
    const md = Math.hypot(x - m.x, z - m.z);
    const mn = md / m.rad;
    if (mn < 1) h += m.h * Math.sqrt(Math.max(0, 1 - mn * mn));
  }
  for (const hill of ISLAND_HILLS) {
    const hd = Math.hypot(x - hill.x, z - hill.z);
    const hn = hd / hill.r;
    if (hn < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - hn * hn));
  }
  return h;
}

// Lagoon water floor: the raw height at the lagoon's center. The terrain is
// gently flattened to this floor under the lagoon so the water disk sits flush.
export const ISLAND_LAGOON_FLOOR = rawIslandHeight(ISLAND_LAGOON.x, ISLAND_LAGOON.z);

export function islandTerrainHeight(x: number, z: number): number {
  let h = rawIslandHeight(x, z);
  const ld = Math.hypot(x - ISLAND_LAGOON.x, z - ISLAND_LAGOON.z);
  const rim = ISLAND_LAGOON.r + 2.5;
  if (ld < rim) {
    const t = Math.min(1, (rim - ld) / 1.5);
    h += (ISLAND_LAGOON_FLOOR - h) * t;
  }
  return h;
}

// ---------- L1: roads ----------
// Closed-ring network (skill rule 6): 4 polylines forming two rings that share
// nodes — no dead ends, every endpoint is shared with another road.
//  * Anel A (sul/lagoa): vila (0,4) → fazenda → praia → lagoa → vila
//  * Anel B (montes): vila (0,4) → pé da serra grande → sela → vale → vila
// No road crosses the lagoon; all stay on the island; deflections ≤ 60°.
export const ISLAND_ROADS: [number, number][][] = [
  [[0, 4], [-12, 8], [-24, 14], [-30, 26], [-22, 42], [0, 52], [18, 48], [32, 38], [45, 31]], // A1 vila → fazenda → praia → lagoa (SW)
  [[45, 31], [52, 20], [48, 8], [36, 2], [20, 0], [0, 4]], // A2 lagoa (E/NE) → vila
  [[0, 4], [-12, -8], [-14, -22], [-8, -28], [0, -30]], // B1 vila → pé da serra grande → sela
  [[0, -30], [10, -27], [16, -16], [10, -6], [0, 4]] // B2 sela → vale central → vila
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
  for (const road of ISLAND_ROADS) best = Math.min(best, distToPolyline(x, z, road));
  return best;
}

// A point must stay on the island (inside the beach ring) for the auto-check.
export function insideIsland(x: number, z: number, margin = 0): boolean {
  return Math.hypot(x, z) <= ISLAND_RADIUS - 3 - margin;
}

// ---------- L2: anchors ----------

export interface PlacedHouse {
  x: number;
  z: number;
  rotY: number;
  colorIndex: number;
}

function faceToward(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

// 7 houses: one along each ring, all with the door facing the road
// (targets sampled from the splines, all inside the band [5.1, 8.1]).
export const ISLAND_HOUSES: PlacedHouse[] = [
  { x: -20, z: 20, rotY: faceToward(-20, 20, -25.5, 15.7), colorIndex: 0 }, // A1, trecho fazenda
  { x: -8, z: 44, rotY: faceToward(-8, 44, -10.0, 49.3), colorIndex: 1 }, // A1, praia SW
  { x: 2, z: 45, rotY: faceToward(2, 45, 2.7, 52.1), colorIndex: 2 }, // A1, praia norte
  { x: 12, z: 43, rotY: faceToward(12, 43, 15.1, 49.2), colorIndex: 3 }, // A1, praia NE
  { x: 40, z: -4, rotY: faceToward(40, -4, 37.9, 2.6), colorIndex: 4 }, // A2, lagoa
  { x: 28, z: -5, rotY: faceToward(28, -5, 27.1, 0.2), colorIndex: 5 }, // A2, leste
  { x: 4, z: -10, rotY: faceToward(4, -10, 9.8, -5.7), colorIndex: 6 } // B2, vale central
];

// 12 lamps along the two rings (band 2–5 m from the road, clear of solids).
export const ISLAND_LAMPS: [number, number][] = [
  [2, 8], // A1, saída da vila
  [-24, 22], // A1, fazenda
  [-12, 52], // A1, praia SW
  [12, 55], // A1, praia N
  [37, 32], // A1, lagoa SW
  [52, 29], // A2, lagoa SE
  [44, 0], // A2, lagoa E
  [28, 4], // A2, leste
  [-10, -15], // B1, serra
  [8, -33], // B1/B2, sela
  [16, -9], // B2, vale E
  [3, -3] // B2, vale W
];

export interface PlacedBench {
  x: number;
  z: number;
  rotY: number;
}

export const ISLAND_BENCHES: PlacedBench[] = [
  { x: 30, z: 9, rotY: faceToward(30, 9, ISLAND_LAGOON.x, ISLAND_LAGOON.z) }, // margem da lagoa
  { x: -18, z: -26, rotY: faceToward(-18, -26, ISLAND_MOUNTAINS[0].x, ISLAND_MOUNTAINS[0].z) }, // pé da serra grande
  { x: 6, z: 58, rotY: faceToward(6, 58, 0, 80) } // praia, olhando o mar
];

// Farm: orchard + pen (fence half = 8 around (-40,14)); barn outside the NW.
export const ISLAND_FENCE = { cx: -40, cz: 14, half: 8, step: 4 };
export const ISLAND_BARN = { x: -54, z: 24 };

export function fencePosts(): { x: number; z: number; rotY: number }[] {
  const { cx, cz, half, step } = ISLAND_FENCE;
  const posts: { x: number; z: number; rotY: number }[] = [];
  for (let i = -half; i <= half; i += step) {
    posts.push({ x: cx + i, z: cz - half, rotY: 0 });
    posts.push({ x: cx + i, z: cz + half, rotY: 0 });
  }
  for (let i = -half + step; i <= half - step; i += step) {
    posts.push({ x: cx - half, z: cz + i, rotY: Math.PI / 2 });
    posts.push({ x: cx + half, z: cz + i, rotY: Math.PI / 2 });
  }
  return posts;
}

// ---------- L2/L3: animals ----------
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

// 34 animals (skill rule 17: ≥ 30). Pen animals stay inside the fence
// (wanderR ≤ 4, anchors ≥ 5 m from the fence line); the rest roam their
// meadows, always clear of roads, lagoon and solids.
export const ISLAND_ANIMALS: PlacedAnimal[] = [
  // Curral (fazenda): dentro do cercado, grade com ≥ 3 m entre animais
  { type: 'chicken', x: -43, z: 17, wanderR: 4 },
  { type: 'chicken', x: -37, z: 17, wanderR: 4 },
  { type: 'chicken', x: -43, z: 11, wanderR: 4 },
  { type: 'chicken', x: -37, z: 11, wanderR: 4 },
  { type: 'sheep', x: -40, z: 14, wanderR: 4 },
  { type: 'sheep', x: -40, z: 17, wanderR: 4 },
  { type: 'sheep', x: -40, z: 11, wanderR: 4 },
  { type: 'cow', x: -43, z: 14, wanderR: 4 },
  // Campo oeste (pasto fora do curral)
  { type: 'cow', x: -36, z: 32, wanderR: 4 },
  { type: 'cow', x: -26, z: 48, wanderR: 4 },
  { type: 'cow', x: -12, z: 36, wanderR: 4 },
  // Vila / campo central
  { type: 'dog', x: -16, z: 24, wanderR: 3 },
  { type: 'dog', x: -4, z: 28, wanderR: 3 },
  { type: 'cat', x: -8, z: 34, wanderR: 3 },
  { type: 'cat', x: 6, z: 36, wanderR: 3 },
  { type: 'chicken', x: -14, z: 32, wanderR: 2.5 },
  { type: 'chicken', x: -2, z: 38, wanderR: 2.5 },
  // Campo sul (entre a praia e a vila)
  { type: 'sheep', x: 18, z: 40, wanderR: 4 },
  { type: 'sheep', x: 21, z: 39, wanderR: 4 },
  { type: 'sheep', x: 8, z: 38, wanderR: 4 },
  { type: 'sheep', x: 28, z: 32, wanderR: 4 },
  { type: 'chicken', x: 18, z: 36, wanderR: 2.5 },
  { type: 'chicken', x: 10, z: 30, wanderR: 2.5 },
  { type: 'chicken', x: 28, z: 28, wanderR: 2.5 },
  // Patos na margem da lagoa (banda de areia, sem entrar na água)
  { type: 'duck', x: 28, z: 24, wanderR: 1.5 },
  { type: 'duck', x: 34, z: 30, wanderR: 1.5 },
  { type: 'duck', x: 44, z: 12, wanderR: 1.5 },
  { type: 'duck', x: 30, z: 28, wanderR: 1.5 },
  // Campo norte (entre a vila e a serra)
  { type: 'sheep', x: -16, z: -2, wanderR: 4 },
  { type: 'sheep', x: -6, z: -20, wanderR: 4 },
  { type: 'dog', x: -4, z: -24, wanderR: 3 },
  { type: 'dog', x: -28, z: -18, wanderR: 3 },
  { type: 'cat', x: -24, z: -4, wanderR: 3 },
  { type: 'chicken', x: -20, z: -10, wanderR: 2.5 }
];

// ---------- L3: vegetation ----------

// Palm grove along the west/south shore (fixed), plus an inland ring of
// trees/palms seeded with rejection.
export const ISLAND_SHORE_PALMS: { x: number; z: number }[] = [
  { x: -20, z: 58 },
  { x: -6, z: 62 },
  { x: 10, z: 58 },
  { x: 24, z: 50 },
  { x: -34, z: 48 },
  { x: -44, z: 36 },
  { x: -50, z: 44 },
  { x: 34, z: 44 }
];

export const ISLAND_INLAND_TREES = { count: 26, minR: 8, maxR: 60, palmsEvery: 3 };

export const ISLAND_BUSH_COUNT = 34;
export const ISLAND_FLOWER_COUNT = 60;

// No snowmen on a tropical island.
export const ISLAND_SNOWMEN: { x: number; z: number; rotY: number }[] = [];

// ---------- Built layout ----------

export interface PlacedTree {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
  palm: boolean;
}

export interface PlacedPoint {
  x: number;
  z: number;
  y: number;
}

export interface IslandLayout {
  seed: number;
  radius: number;
  mountains: IslandPeakPos[];
  waters: { x: number; z: number; r: number }[];
  roads: [number, number][][];
  houses: (PlacedHouse & PlacedPoint)[];
  lamps: PlacedPoint[];
  benches: (PlacedBench & PlacedPoint)[];
  barn?: PlacedPoint; // optional: data-driven levels (editor) may omit the barn
  fencePosts: (PlacedPoint & { rotY: number })[];
  animals: (PlacedAnimal & PlacedPoint)[];
  trees: PlacedTree[];
  bushes: PlacedPoint[];
  flowers: PlacedPoint[];
}

function placeTree(
  rng: () => number,
  x: number,
  z: number,
  palm: boolean,
  list: PlacedTree[]
): void {
  const scale = 0.9 + rng() * 0.5;
  list.push({ x, z, y: islandTerrainHeight(x, z), scale, rotY: rng() * TAU, palm });
}

// Obstacles vegetation must keep clear of (barn, benches, lamps, the pen).
function vegObstacles(): { x: number; z: number; r: number }[] {
  const out: { x: number; z: number; r: number }[] = [
    { x: ISLAND_BARN.x, z: ISLAND_BARN.z, r: 2.3 },
    ...ISLAND_BENCHES.map((b) => ({ x: b.x, z: b.z, r: 1.0 })),
    ...ISLAND_LAMPS.map(([x, z]) => ({ x, z, r: 0.5 })),
    ...fencePosts().map((p) => ({ x: p.x, z: p.z, r: 0.4 }))
  ];
  return out;
}

export function buildIslandLayout(): IslandLayout {
  const rng = mulberry32(ISLAND_SEED);

  // L2 anchors (fixed, hand-tuned).
  const houses = ISLAND_HOUSES.map((h) => ({ ...h, y: islandTerrainHeight(h.x, h.z) }));
  const lamps = ISLAND_LAMPS.map(([x, z]) => ({ x, z, y: islandTerrainHeight(x, z) }));
  const benches = ISLAND_BENCHES.map((b) => ({ ...b, y: islandTerrainHeight(b.x, b.z) }));
  const barn = { ...ISLAND_BARN, y: islandTerrainHeight(ISLAND_BARN.x, ISLAND_BARN.z) };
  const fencePostPlacements = fencePosts().map((p) => ({
    ...p,
    y: islandTerrainHeight(p.x, p.z)
  }));
  const animals = ISLAND_ANIMALS.map((a) => ({ ...a, y: islandTerrainHeight(a.x, a.z) }));
  const obstacles = vegObstacles();

  // L3 trees. Shore palms are fixed; inland trees are seeded with rejection.
  const trees: PlacedTree[] = [];
  for (const p of ISLAND_SHORE_PALMS) placeTree(rng, p.x, p.z, true, trees);

  let placed = 0;
  let attempts = 0;
  while (placed < ISLAND_INLAND_TREES.count && attempts < 1200) {
    attempts++;
    const a = rng() * TAU;
    const r = ISLAND_INLAND_TREES.minR + Math.sqrt(rng()) * (ISLAND_INLAND_TREES.maxR - ISLAND_INLAND_TREES.minR);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rad = 1.2 * 1.4; // worst-case tree solid for clearance
    if (!insideIsland(x, z, 4)) continue; // stay off the beach ring
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + rad + 0.5) continue;
    if (Math.hypot(x - ISLAND_LAGOON.x, z - ISLAND_LAGOON.z) < ISLAND_LAGOON.r + rad + 0.3) continue;
    let nearHouse = false;
    for (const h of ISLAND_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + rad + 0.8) {
        nearHouse = true;
        break;
      }
    }
    if (nearHouse) continue;
    let bad = false;
    for (const m of mountainPositions()) {
      if (Math.hypot(x - m.x, z - m.z) < m.rad + rad + 0.2) {
        bad = true;
        break;
      }
    }
    if (!bad) {
      for (const hill of ISLAND_HILLS) {
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
      for (const an of ISLAND_ANIMALS) {
        if (Math.hypot(x - an.x, z - an.z) < an.wanderR + rad + 0.2) {
          bad = true;
          break;
        }
      }
    }
    if (!bad) {
      for (const t of trees) {
        if (Math.hypot(x - t.x, z - t.z) < 1.2 * t.scale + rad + 0.4) {
          bad = true;
          break;
        }
      }
    }
    if (bad) continue;
    placeTree(rng, x, z, placed % ISLAND_INLAND_TREES.palmsEvery === 0, trees);
    placed++;
  }

  // Bushes and flowers: meadow patches, clear of roads/water/solids.
  const bushes: PlacedPoint[] = [];
  let attemptsB = 0;
  while (bushes.length < ISLAND_BUSH_COUNT && attemptsB < 800) {
    attemptsB++;
    const a = rng() * TAU;
    const r = 8 + rng() * 46;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!insideIsland(x, z, 4)) continue;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.9 + 0.3) continue;
    if (Math.hypot(x - ISLAND_LAGOON.x, z - ISLAND_LAGOON.z) < ISLAND_LAGOON.r + 0.9 + 0.3) continue;
    let nearHouse = false;
    for (const h of ISLAND_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.9 + 0.4) {
        nearHouse = true;
        break;
      }
    }
    if (nearHouse) continue;
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
    if (bad) continue;
    bushes.push({ x, z, y: islandTerrainHeight(x, z) });
  }

  const flowers: PlacedPoint[] = [];
  let attemptsF = 0;
  while (flowers.length < ISLAND_FLOWER_COUNT && attemptsF < 1300) {
    attemptsF++;
    const a = rng() * TAU;
    const r = 6 + rng() * 52;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!insideIsland(x, z, 3)) continue;
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.4 + 0.1) continue;
    if (Math.hypot(x - ISLAND_LAGOON.x, z - ISLAND_LAGOON.z) < ISLAND_LAGOON.r + 0.4 + 0.1) continue;
    let nearHouse = false;
    for (const h of ISLAND_HOUSES) {
      if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.4 + 0.1) {
        nearHouse = true;
        break;
      }
    }
    if (nearHouse) continue;
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
    flowers.push({ x, z, y: islandTerrainHeight(x, z) });
  }

  return {
    seed: ISLAND_SEED,
    radius: ISLAND_RADIUS,
    mountains: mountainPositions(),
    waters: [{ ...ISLAND_LAGOON }],
    roads: ISLAND_ROADS,
    houses,
    lamps,
    benches,
    barn,
    fencePosts: fencePostPlacements,
    animals,
    trees,
    bushes,
    flowers
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

export function layoutSolids(layout: IslandLayout): LayoutSolid[] {
  const out: LayoutSolid[] = [];
  // Mountain solid = the rocky core (rad - 3); the gentle outer slope is
  // walkable grass, so roads may approach the foot.
  for (const m of layout.mountains) out.push({ x: m.x, z: m.z, r: m.rad - 3, clearance: 0.2, kind: 'mountain' });
  for (const h of layout.houses) out.push({ x: h.x, z: h.z, r: 1.9, clearance: 0.8, kind: 'house' });
  if (layout.barn) out.push({ x: layout.barn.x, z: layout.barn.z, r: 2.3, clearance: 0.8, kind: 'barn' });
  for (const f of layout.fencePosts) out.push({ x: f.x, z: f.z, r: 0.4, clearance: 0.4, kind: 'fence' });
  for (const b of layout.benches) out.push({ x: b.x, z: b.z, r: 1.0, clearance: 0.3, kind: 'bench' });
  for (const l of layout.lamps) out.push({ x: l.x, z: l.z, r: 0.5, clearance: 0.2, kind: 'lamp' });
  for (const t of layout.trees) out.push({ x: t.x, z: t.z, r: 1.2 * t.scale, clearance: 0.4, kind: 'tree' });
  for (const a of layout.animals) {
    if (a.type !== 'duck') out.push({ x: a.x, z: a.z, r: 1.0, clearance: 0.2, kind: 'animal' });
  }
  return out;
}
