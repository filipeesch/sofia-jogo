// Pure, deterministic layout for "Mundo da Neve" (worldType 'snow').
//
// Intentionally free of THREE: it only computes data (zones, road control
// points, placed objects, collision solids), so
// scripts/check-snow-level.mjs can import it in Node and validate the level
// (same seed = same level).
//
// Scale: the world is ~5x the original in useful area (radius ~32 -> ~75).
// Content lives within r≈80; six soft snow drifts frame the ring.
//
// Zones (x/z; +x east, +z south; village hub at (0,-6)):
//   - MAIN ROAD (R1): spawn (0,26) -> village hub (0,-6).
//   - VILA: 3 cozy houses around the hub, in the [5.1, 8.1] road band.
//   - LAGO CONGELADO: (-26,-20) r 11 — R3's scenic spur ends on its shore.
//   - PINHEIRAL: pine cluster around (40,-4); R2's ring ends near its edge.
//   - ARCO-ÍRIS: the global arch (x 11..37, z=-24) — R4 passes under it.
//   - BONECOS: 5 by the village, 5 along the north alameda.
//   - 8 street lamps with real point lights (night mode).
//   - Animals: sheep, cows, chickens, dogs and cats (no ducks — frozen lake).

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

export const SNOW_SEED = 20240125;

// Six soft drifts (white domes). Kept far enough from the lake shore and the
// roads that terrain stays low where it matters (village, arch zone, water).
export const SNOW_HILLS: { x: number; z: number; r: number; h: number }[] = [
  { x: -44, z: 10, r: 20, h: 2.2 },
  { x: 12, z: 36, r: 18, h: 2.0 },
  { x: 30, z: -52, r: 22, h: 2.6 },
  { x: 48, z: 18, r: 20, h: 2.2 },
  { x: -18, z: 44, r: 18, h: 2.0 },
  { x: -56, z: -16, r: 20, h: 2.4 }
];

export const SNOW_LAKE = { x: -26, z: -20, r: 11 }; // frozen lake (ice disc)

// Snow height: sum of flattened hemisphere bumps — single source of truth,
// shared by rendering, placement and the auto-check.
export function snowTerrainHeight(x: number, z: number): number {
  let h = 0;
  for (const hill of SNOW_HILLS) {
    const d = Math.hypot(x - hill.x, z - hill.z);
    const n = d / hill.r;
    if (n < 1) h += hill.h * Math.sqrt(Math.max(0, 1 - n * n));
  }
  return h;
}

// ---------- L1: roads ----------
// One connected network around the hub (0,-6):
//   R1 main (spawn -> village), R2 east ring (ends at the pine grove edge),
//   R3 west spur (ends on the frozen lake shore), R4 north alameda (passes
//   under the rainbow arch, ends at the pines). Three scenic dead ends —
//   the on-rails tour U-turns there, exactly like the mountain spokes.
export const SNOW_ROADS: [number, number][][] = [
  [[0, 26], [0, 8], [0, -6]], // R1 main: spawn -> vila
  [[0, -6], [14, -10], [28, -8], [36, 2], [28, 12], [12, 10], [0, -6]], // R2: anel leste (pinheiral)
  [[0, -6], [-10, -8], [-17, -12]], // R3: beira do lago congelado
  [[0, -6], [6, -18], [16, -24], [28, -22], [34, -10]] // R4: alameda do arco-íris
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
  for (const road of SNOW_ROADS) best = Math.min(best, distToPolyline(x, z, road));
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

// Three cozy houses in the [5.1, 8.1] band of R1/R4/R5 roads, facing them.
export const SNOW_HOUSES: PlacedHouse[] = [
  { x: 7, z: 14, rotY: faceToward(7, 14, 0, 14), colorIndex: 0 }, // L da rua principal
  { x: -7, z: 14, rotY: faceToward(-7, 14, 0, 14), colorIndex: 1 }, // R da rua principal
  { x: -6, z: 0, rotY: faceToward(-6, 0, 0, 0), colorIndex: 2 } // cabana do hub, lado oeste
];

export const SNOW_LAMPS: [number, number][] = [
  [2.8, 10],
  [-2.8, 10],
  [2.8, -2],
  [-2.8, -2],
  [10, -16], // R4: alameda
  [26, -26], // R4: perto do arco
  [30, 0], // R2: anel leste
  [-14, -6] // R3: caminho do gelo
];

// Pine cluster center + seeded ring (the "pinheiral").
export const SNOW_FOREST = { x: 40, z: -4, inner: 8, outer: 16, count: 26 };
export const SNOW_SCATTER_PINES = 20; // extra pines around the content ring

// Ten snowmen: five by the village, five along the north alameda.
export const SNOW_SNOWMEN: [number, number][] = [
  [12, 20],
  [-12, 6],
  [10, 24],
  [-10, 24],
  [4, 18],
  [10, -30],
  [24, -18],
  [36, -16],
  [38, -8],
  [-4, -16]
];

// ---------- L2/L3: animals ----------
// 14 animals, each with a free wander circle (road ≥ 3 m, lake rim clear, no
// solid inside the circle). No ducks — the lake is frozen.
export interface PlacedAnimal {
  type: string;
  x: number;
  z: number;
  wanderR: number;
}

export const SNOW_ANIMALS: PlacedAnimal[] = [
  // Village meadow
  { type: 'sheep', x: 16, z: 6, wanderR: 4 },
  { type: 'sheep', x: -16, z: 8, wanderR: 4 },
  { type: 'chicken', x: 10, z: -14, wanderR: 3 },
  { type: 'chicken', x: -8, z: -14, wanderR: 3 },
  { type: 'dog', x: -18, z: 20, wanderR: 4 },
  { type: 'cat', x: -14, z: 16, wanderR: 4 },
  // East meadow, beyond the pine grove
  { type: 'cow', x: 52, z: 20, wanderR: 5 },
  { type: 'sheep', x: 60, z: 4, wanderR: 5 },
  { type: 'chicken', x: 34, z: 16, wanderR: 3 },
  // North alameda (rainbow path)
  { type: 'cow', x: 24, z: -34, wanderR: 5 },
  { type: 'sheep', x: 34, z: -34, wanderR: 4 },
  // West drifts / ice path
  { type: 'cow', x: -34, z: 4, wanderR: 5 },
  { type: 'dog', x: -30, z: -34, wanderR: 4 },
  { type: 'cat', x: 20, z: 36, wanderR: 4 }
];

// ---------- Built layout ----------

export interface PlacedPoint {
  x: number;
  z: number;
  y: number;
}

export interface PlacedPine {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
}

export interface SnowLayout {
  seed: number;
  hills: { x: number; z: number; r: number; h: number }[];
  lake: { x: number; z: number; r: number };
  roads: [number, number][][]; // control polylines
  houses: (PlacedHouse & PlacedPoint)[];
  lamps: PlacedPoint[];
  pines: PlacedPine[];
  snowmen: (PlacedPoint & { rotY: number })[];
  animals: (PlacedAnimal & PlacedPoint)[];
}

export function buildSnowLayout(): SnowLayout {
  const rng = mulberry32(SNOW_SEED);

  const houses = SNOW_HOUSES.map((h) => ({ ...h, y: snowTerrainHeight(h.x, h.z) }));
  const lamps = SNOW_LAMPS.map(([x, z]) => ({ x, z, y: snowTerrainHeight(x, z) }));
  const snowmen = SNOW_SNOWMEN.map(([x, z]) => ({ x, z, y: snowTerrainHeight(x, z), rotY: rng() * TAU }));
  const animals = SNOW_ANIMALS.map((a) => ({ ...a, y: snowTerrainHeight(a.x, a.z) }));

  // Pines: seeded ring around the grove + scattered content-ring pines,
  // clear of roads, lake, houses, snowmen, lamps and animal wander circles.
  const pines: PlacedPine[] = [];
  const pineRad = 1.2 * 1.3; // worst-case pine solid for clearance

  const tryPine = (x: number, z: number, scale: number): boolean => {
    // Spline samples can bow ~1 m off the control polyline — keep a wider
    // margin so no placed pine ends up inside the checker's r + 2.0 rule.
    if (distToAnyRoad(x, z) < ROAD_HALF_WIDTH + pineRad + 2.0) return false;
    if (Math.hypot(x - SNOW_LAKE.x, z - SNOW_LAKE.z) < SNOW_LAKE.r + pineRad + 0.5) return false;
    for (const h of SNOW_HOUSES) if (Math.hypot(x - h.x, z - h.z) < 1.9 + pineRad + 0.8) return false;
    for (const s of SNOW_SNOWMEN) if (Math.hypot(x - s[0], z - s[1]) < 1.6 + pineRad + 0.5) return false;
    for (const l of SNOW_LAMPS) if (Math.hypot(x - l[0], z - l[1]) < 0.5 + pineRad + 0.5) return false;
    for (const a of SNOW_ANIMALS) if (Math.hypot(x - a.x, z - a.z) < a.wanderR + pineRad + 0.2) return false;
    for (const p of pines) if (Math.hypot(x - p.x, z - p.z) < 1.2 * p.scale + 1.2 * scale + 0.4) return false;
    pines.push({ x, z, y: snowTerrainHeight(x, z), scale, rotY: rng() * TAU });
    return true;
  };

  {
    const { x: fx, z: fz, inner, outer, count } = SNOW_FOREST;
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 800) {
      attempts++;
      const a = rng() * TAU;
      const r = inner + Math.sqrt(rng()) * (outer - inner); // uniform in the annulus
      const scale = 0.9 + rng() * 0.4;
      if (tryPine(fx + Math.cos(a) * r, fz + Math.sin(a) * r, scale)) placed++;
    }
  }
  {
    let placed = 0;
    let attempts = 0;
    while (placed < SNOW_SCATTER_PINES && attempts < 800) {
      attempts++;
      const a = rng() * TAU;
      const r = 18 + Math.sqrt(rng()) * 42;
      const scale = 0.9 + rng() * 0.4;
      if (tryPine(Math.cos(a) * r, Math.sin(a) * r, scale)) placed++;
    }
  }

  return {
    seed: SNOW_SEED,
    hills: SNOW_HILLS.map((h) => ({ ...h })),
    lake: { ...SNOW_LAKE },
    roads: SNOW_ROADS,
    houses,
    lamps,
    pines,
    snowmen,
    animals
  };
}

// Collision solids implied by the layout (shared with the auto-check).
import type { Solid } from '../utils';

export interface LayoutSolid extends Solid {
  kind: string;
}

export function layoutSolids(layout: SnowLayout): LayoutSolid[] {
  const out: LayoutSolid[] = [];
  for (const h of layout.houses) out.push({ x: h.x, y: h.y + 1.6, z: h.z, r: 1.9, h: 3.2, kind: 'house' });
  for (const s of layout.snowmen) out.push({ x: s.x, y: s.y + 1.8, z: s.z, r: 1.6, h: 3.8, kind: 'snowman' });
  for (const p of layout.pines) out.push({ x: p.x, y: p.y + 1.5 * p.scale, z: p.z, r: 1.2 * p.scale, h: 4 * p.scale, kind: 'pine' });
  for (const a of layout.animals) out.push({ x: a.x, y: a.y + 0.7, z: a.z, r: 1.0, h: 1.4, kind: 'animal' });
  return out;
}
