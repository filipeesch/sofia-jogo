// Pure, deterministic layout for "Deserto" (worldType 'desert').
//
// This module is intentionally free of THREE: it only computes data (dunes,
// oasis, roads, placed houses/pyramids/cacti/animals/lamps, collision solids),
// so scripts/check-desert-level.mjs can import it in Node and validate the
// level (skill rule 12: seed + fixed L0→L4 order, same seed = same level).
//
// Scale: the desert is ~5x the original in useful area (linear factor ~2.2).
// Old content lived within r≈32; the new content ring extends to r≈75. The
// generic 5-road grid is replaced by a small closed, themed road network:
// a union of closed rings (skill rule 6) — every road end coincides with
// another road's end (no dead ends, 0 U-turns), control deflections ≤ 60°.
//
// Zones (x/z; sandy floor at y=0, low (≤0.8) around the village, the rainbow
// zone, the roads and the oasis):
//   - VILA: 3 adobe houses in a band [5.1..8.1] of ring A, all facing the
//     street, near the hub (-2,2).
//   - OÁSIS: water disc at (30,26) r 9; ring A loops around it (centerline
//     ≥ ~14 m from its center — the ribbon never touches the water).
//   - PIRÂMIDES: cluster NW — big (-44,-36) r5.5 h7.5, medium (-54,-24) r4.5 h6,
//     small (-38,-48) r3.5 h5. Ring B loops around the whole cluster.
//   - ALAMEDA DE CACTOS: double ring around the oasis + scattered cacti in the
//     content ring (r 34..70).
//   - ARCO-ÍRIS: global fixed arch at x 11..37, z=-24; ring B passes under it.
//
// Roads (4 polylines, 2 closed rings sharing the village hub (-2,2)):
//   Ring A (oásis): A1 hub → spawn side (2,20) → margem S/E do oásis → (44,34);
//                   A2 (44,34) → margem N/O → hub (handle compartilhado).
//   Ring B (pirâmides): B1 hub → cluster (E → N → W → S) → arco-íris (24,-24);
//                       B2 arco-íris → hub. Nenhuma estrada cruza o oásis nem
//                       toca as pirâmides.

import type { Solid } from '../utils';

export const TAU = Math.PI * 2;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t + (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- L0: terrain / zones ----------

export const DESERT_SEED = 20240815;

export const DESERT_ROADS: [number, number][][] = [
  // A1: hub → handle (perto do spawn 0,20) → margem S/E do oásis → (44,34).
  [
    [-2, 2],
    [0, 12],
    [2, 20],
    [10, 24],
    [16, 32],
    [26, 40],
    [36, 42],
    [42, 38],
    [44, 34]
  ],
  // A2: (44,34) → margem N/O do oásis → handle → hub (fecha o anel A).
  [
    [44, 34],
    [42, 40],
    [36, 46],
    [28, 48],
    [20, 44],
    [12, 36],
    [4, 24],
    [2, 20],
    [0, 12],
    [-2, 2]
  ],
  // B1: hub → cluster de pirâmides (E → N → W → S) → arco-íris (24,-24).
  [
    [-2, 2],
    [-12, -5],
    [-22, -15],
    [-32, -24],
    [-42, -26],
    [-45, -24],
    [-48, -18],
    [-56, -16],
    [-60, -19],
    [-62, -24],
    [-60, -30],
    [-52, -38],
    [-48, -46],
    [-46, -52],
    [-42, -54],
    [-38, -54],
    [-30, -52],
    [-28, -48],
    [-26, -42],
    [-22, -34],
    [-18, -26],
    [-8, -24],
    [4, -24],
    [16, -24],
    [24, -24]
  ],
  // B2: arco-íris → hub (fecha o anel B).
  [
    [24, -24],
    [16, -14],
    [8, -6],
    [-2, 2]
  ]
];

export const ROAD_HALF_WIDTH = 1.7;

// Oasis: water disc, y=0.06; roads and animals stay clear of the disc.
export const DESERT_OASIS = { x: 30, z: 26, r: 9 };

// Road-oasis clearance: a road is "crossing" the oasis when its centerline
// sample is more than ROAD_OASIS_CLEARANCE inside the water disc's rim. The
// reworked ring A keeps every sample well outside the rim, so this tolerance
// is only a safety net (the road never enters the water).
export const ROAD_OASIS_CLEARANCE = 4.0;

// Dunes: 7 soft domes in the content ring (r 18–28, h 1.6–2.8). Terrain is
// the sum of hemisphere profiles — the single source of truth, shared by
// rendering, placement and the auto-check. Kept LOW (≤0.8) around the
// village, the rainbow zone, the roads and the oasis by construction.
export const DESERT_DUNES: { x: number; z: number; r: number; h: number }[] = [
  { x: 12, z: 48, r: 18, h: 2.2 },
  { x: 58, z: 42, r: 20, h: 2.4 },
  { x: 56, z: -38, r: 19, h: 2.1 },
  { x: -12, z: -66, r: 22, h: 2.6 },
  { x: -60, z: 26, r: 18, h: 1.9 },
  { x: 54, z: -2, r: 16, h: 1.6 },
  { x: -2, z: 68, r: 26, h: 2.8 }
];

export function desertTerrainHeight(x: number, z: number): number {
  let h = 0;
  for (const d of DESERT_DUNES) {
    const n = Math.hypot(x - d.x, z - d.z) / d.r;
    if (n < 1) h += d.h * Math.sqrt(Math.max(0, 1 - n * n));
  }
  return h;
}

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
  for (const road of DESERT_ROADS) best = Math.min(best, distToPolyline(x, z, road));
  return best;
}

// ---------- L2: anchors ----------

function faceToward(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

export interface PlacedHouse {
  x: number;
  z: number;
  rotY: number;
  colorIndex: number;
}

// Three adobe houses, all in the band [5.1..8.1] of ring A, facing their
// street (toward the road centerline).
export const DESERT_HOUSES: PlacedHouse[] = [
  { x: -8, z: 8, rotY: faceToward(-8, 8, -1, 7), colorIndex: 0 }, // oeste do handle
  { x: 7, z: 14, rotY: faceToward(7, 14, 1, 15), colorIndex: 1 }, // leste do handle
  { x: 2, z: 32, rotY: faceToward(2, 32, 7, 27), colorIndex: 2 } // norte do handle
];

// Pyramids: hand-placed cluster NW (visual y-rotation jitter uses seed+1).
export interface PlacedPyramid {
  x: number;
  z: number;
  r: number;
  h: number;
}

export const DESERT_PYRAMIDS: PlacedPyramid[] = [
  { x: -44, z: -36, r: 5.5, h: 7.5 }, // big
  { x: -54, z: -24, r: 4.5, h: 6.0 }, // medium
  { x: -38, z: -48, r: 3.5, h: 5.0 } // small
];

// Nine street lamps: at the road edge near the village (≥3.1 m from every
// house, so the house solid's 0.8 m clearance band stays free), on the oasis
// ring, at the pyramid POI, and on the rainbow alameda.
export const DESERT_LAMPS: [number, number][] = [
  [-4, 7], // A1: handle, L da rua
  [-3, 16], // A1: handle, R da rua
  [9, 18], // A1: entrada do oásis
  [30, 51], // A2: norte do oásis
  [38, 50], // A2: NE do oásis
  [20, 30], // A1/A2: sudeste do oásis
  [-26, -14], // B1: aproximação das pirâmides
  [10, -20], // B1: alameda do arco-íris
  [20, -28] // B1: sob o arco
];

// ---------- L2/L3: animals ----------
// 32 desert animals (skill rule 17: ≥ 30), each with a free wander circle
// (road ≥ wanderR + 1.7 + 0.2, oasis rim clear, no solid inside the circle).
// No ducks in the desert.
// (Lamps are intentionally NOT in the solids list — they stand at the road
//  edge (r≈3.5 m) and the on-rails tour's lane shift would hit a lamp solid;
//  they do not block gameplay.)
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

export const DESERT_ANIMALS: PlacedAnimal[] = [
  // Vila / handle (meadow between the houses and the roads)
  { type: 'dog', x: 8, z: 4, wanderR: 4 },
  { type: 'cat', x: -12, z: 2, wanderR: 3 },
  { type: 'chicken', x: -16, z: 6, wanderR: 3 },
  { type: 'sheep', x: 12, z: 10, wanderR: 4 },
  { type: 'sheep', x: 16, z: 6, wanderR: 5 },
  // South field (entre o handle e as dunas do sul)
  { type: 'sheep', x: 52, z: 10, wanderR: 5 },
  { type: 'sheep', x: -2, z: 40, wanderR: 5 },
  { type: 'chicken', x: 8, z: 40, wanderR: 3 },
  { type: 'sheep', x: 22, z: 14, wanderR: 4 },
  { type: 'dog', x: 24, z: 14, wanderR: 3 },
  // Oasis meadow (inside ring A, entre a água e a estrada)
  { type: 'sheep', x: 40, z: 16, wanderR: 4 },
  { type: 'sheep', x: 44, z: 14, wanderR: 4 },
  { type: 'chicken', x: 34, z: 12, wanderR: 3 },
  { type: 'sheep', x: 50, z: 32, wanderR: 4 },
  { type: 'chicken', x: 46, z: 48, wanderR: 3 },
  { type: 'cat', x: 26, z: 12, wanderR: 3 },
  { type: 'sheep', x: 18, z: 18, wanderR: 4 },
  // Pyramid meadow (campo ao redor do cluster)
  { type: 'sheep', x: -26, z: -6, wanderR: 4 },
  { type: 'sheep', x: -34, z: -12, wanderR: 4 },
  { type: 'chicken', x: -44, z: -14, wanderR: 3 },
  { type: 'dog', x: -56, z: -10, wanderR: 4 },
  { type: 'cat', x: -68, z: -34, wanderR: 3 },
  // Arco-íris / campo norte
  { type: 'sheep', x: 0, z: -12, wanderR: 4 },
  { type: 'chicken', x: -6, z: -14, wanderR: 3 },
  { type: 'sheep', x: 14, z: -2, wanderR: 4 },
  { type: 'sheep', x: 22, z: -8, wanderR: 4 },
  { type: 'cat', x: 26, z: -18, wanderR: 3 },
  { type: 'sheep', x: 30, z: -40, wanderR: 5 },
  // Sudoeste (campo aberto entre a vila e as dunas)
  { type: 'sheep', x: -30, z: 20, wanderR: 5 },
  { type: 'sheep', x: -44, z: 14, wanderR: 5 },
  { type: 'chicken', x: -36, z: 8, wanderR: 3 },
  { type: 'dog', x: -48, z: 4, wanderR: 4 }
];

// ---------- L4: flight tour waypoints ----------
// Closed CatmullRom (centripetal) airplane tour, 7 waypoints (the coordinator
// mirrors these into src/rails/flightTour.ts). Altitudes stay in [3.2, 26],
// takeoff ≈ (0,13,42), passes the village, the oasis, the pyramids, the cactus
// alameda, and includes EXACTLY the global rainbow point [24,10,-24].
export const DESERT_FLIGHT_WAYPOINTS: [number, number, number][] = [
  [0, 13, 42], // decolagem (perto do spawn)
  [-2, 12, 4], // vila (hub)
  [30, 11, 26], // oásis
  [42, 12, 36], // alameda de cactos sul
  [24, 10, -24], // arco-íris (ponto global fixo)
  [-44, 18, -36], // pirâmides (grande)
  [10, 12, 20] // campo sul (fecha o circuito)
];

// ---------- Built layout ----------

export interface PlacedPoint {
  x: number;
  z: number;
  y: number;
}

export interface PlacedCactus {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
}

export interface DesertLayout {
  seed: number;
  dunes: { x: number; z: number; r: number; h: number }[];
  oasis: { x: number; z: number; r: number };
  roads: [number, number][][]; // control polylines
  houses: (PlacedHouse & PlacedPoint)[];
  pyramids: (PlacedPyramid & PlacedPoint)[];
  cacti: PlacedCactus[];
  animals: (PlacedAnimal & PlacedPoint)[];
  lamps: PlacedPoint[];
  flightWaypoints: [number, number, number][];
}

// ~30 cacti: a double ring around the oasis (the "alameda de cactos") plus
// scattered cacti in the content ring. Placed by seeded rejection: clear of
// roads (≥ 3 m), the oasis rim, houses, pyramids, animal wander circles and
// other cacti.
const CACTUS_RING = { x: DESERT_OASIS.x, z: DESERT_OASIS.z, inner: 12.5, outer: 18, count: 14 };
const CACTUS_RING2 = { x: DESERT_OASIS.x, z: DESERT_OASIS.z, inner: 21, outer: 26, count: 10 };
const CACTUS_SCATTER = { count: 6, rMin: 34, rMax: 70 };

export function buildDesertLayout(): DesertLayout {
  const rng = mulberry32(DESERT_SEED);

  const houses = DESERT_HOUSES.map((h) => ({ ...h, y: desertTerrainHeight(h.x, h.z) }));
  const pyramids = DESERT_PYRAMIDS.map((p) => ({ ...p, y: desertTerrainHeight(p.x, p.z) }));
  const lamps = DESERT_LAMPS.map(([x, z]) => ({ x, z, y: desertTerrainHeight(x, z) }));
  const animals = DESERT_ANIMALS.map((a) => ({ ...a, y: desertTerrainHeight(a.x, a.z) }));

  // ---- L3: cacti (seeded rejection) ----
  const cacti: PlacedCactus[] = [];

  const tryCactus = (x: number, z: number): boolean => {
    const scale = 0.85 + rng() * 0.5; // 0.85..1.35 — visual, position already fixed
    const rotY = rng() * TAU;
    // Extra margin beyond road half-width: the Catmull spline bows up to
    // ~0.6 m off the control polyline, and the auto-check clears samples by
    // solid r + 2.0 — 1.7 keeps every cactus clear of the rendered spline.
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + 0.9 + 1.7) return false;
    if (Math.hypot(x - DESERT_OASIS.x, z - DESERT_OASIS.z) < DESERT_OASIS.r + 0.9 + 1.5) return false;
    for (const h of DESERT_HOUSES) if (Math.hypot(x - h.x, z - h.z) < 1.9 + 0.9 + 1.0) return false;
    for (const p of DESERT_PYRAMIDS) if (Math.hypot(x - p.x, z - p.z) < p.r + 0.9 + 2.5) return false;
    for (const a of DESERT_ANIMALS) if (Math.hypot(x - a.x, z - a.z) < a.wanderR + 0.9 + 0.5) return false;
    for (const l of DESERT_LAMPS) if (Math.hypot(x - l[0], z - l[1]) < 0.5 + 0.9 + 0.6) return false;
    for (const c of cacti) if (Math.hypot(x - c.x, z - c.z) < 0.9 * c.scale + 0.9 * scale + 0.8) return false;
    cacti.push({ x, z, y: desertTerrainHeight(x, z), scale, rotY });
    return true;
  };

  const ringCacti = (ring: { x: number; z: number; inner: number; outer: number; count: number }): void => {
    let placed = 0;
    let attempts = 0;
    while (placed < ring.count && attempts < 800) {
      attempts++;
      const a = rng() * TAU;
      const r = ring.inner + Math.sqrt(rng()) * (ring.outer - ring.inner); // uniform in the annulus
      const x = ring.x + Math.cos(a) * r;
      const z = ring.z + Math.sin(a) * r;
      if (tryCactus(x, z)) placed++;
    }
  };

  ringCacti(CACTUS_RING);
  ringCacti(CACTUS_RING2);
  {
    let placed = 0;
    let attempts = 0;
    while (placed < CACTUS_SCATTER.count && attempts < 800) {
      attempts++;
      const a = rng() * TAU;
      const r = CACTUS_SCATTER.rMin + rng() * (CACTUS_SCATTER.rMax - CACTUS_SCATTER.rMin);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (tryCactus(x, z)) placed++;
    }
  }

  return {
    seed: DESERT_SEED,
    dunes: DESERT_DUNES.map((d) => ({ ...d })),
    oasis: { ...DESERT_OASIS },
    roads: DESERT_ROADS,
    houses,
    pyramids,
    cacti,
    animals,
    lamps,
    flightWaypoints: DESERT_FLIGHT_WAYPOINTS
  };
}

// Collision solids implied by the layout (shared with the auto-check).
export interface LayoutSolid extends Solid {
  kind: string;
}

export function layoutSolids(layout: DesertLayout): LayoutSolid[] {
  const out: LayoutSolid[] = [];
  for (const p of layout.pyramids) out.push({ x: p.x, y: p.y + p.h / 2, z: p.z, r: p.r, h: p.h, kind: 'pyramid' });
  for (const h of layout.houses) out.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2, kind: 'house' });
  for (const a of layout.animals) out.push({ x: a.x, y: a.y + 0.7, z: a.z, r: 1.0, h: 1.4, kind: 'animal' });
  for (const c of layout.cacti) out.push({ x: c.x, y: c.y + 1.0 * c.scale, z: c.z, r: 0.9 * c.scale, h: 2.0 * c.scale, kind: 'cactus' });
  // NOTE: lamps are NOT registered as solids — they stand at the road edge
  // (r≈3.5 m) and the on-rails tour's lane shift (±1.35 m) would hit a lamp
  // solid; lamps do not block gameplay.
  return out;
}
