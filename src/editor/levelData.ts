// ---------------------------------------------------------------------------
// Level data model — the "save file" of the map editor.
//
// A LevelData describes everything the game renders EXCEPT the terrain shape
// (hills, dunes, peaks, waters), which stays procedural per world type
// (src/world/*Layout.ts). Roads, placed objects and flight waypoints are all
// explicit, so the editor and the game share the same source of truth.
//
// LevelData is JSON-serializable (public/levels/<id>.json and localStorage)
// and is consumed by the terrain classes through layoutFromData() — the game
// renders data-driven levels exactly the way it renders the procedural ones.
// ---------------------------------------------------------------------------

import type { LevelConfig, WorldType } from '../levels';
import { LEVELS } from '../levels';
import {
  buildValleyLayout,
  valleyTerrainHeight,
  VALLEY_SEED,
  VALLEY_HILLS,
  VALLEY_WATERS,
  VALLEY_FARM,
  type ValleyLayout,
  type TreeKind as ValleyTreeKind
} from '../world/valleyLayout';
import {
  buildIslandLayout,
  islandTerrainHeight,
  ISLAND_SEED,
  ISLAND_RADIUS,
  ISLAND_LAGOON,
  mountainPositions,
  type IslandLayout
} from '../world/islandLayout';
import {
  buildMountainsLayout,
  mountainTerrainHeight,
  MOUNTAIN_SEED,
  MOUNTAINS_WATERS,
  peakPositions,
  type MountainsLayout
} from '../world/mountainsLayout';
import {
  buildSnowLayout,
  snowTerrainHeight,
  SNOW_SEED,
  SNOW_HILLS,
  SNOW_LAKE,
  type SnowLayout
} from '../world/snowLayout';
import {
  buildDesertLayout,
  desertTerrainHeight,
  DESERT_SEED,
  DESERT_DUNES,
  DESERT_OASIS,
  DESERT_FLIGHT_WAYPOINTS,
  type DesertLayout
} from '../world/desertLayout';

// ---------- Placed-object shapes (flat, JSON-friendly) ----------

export interface HouseData { x: number; z: number; rotY: number; colorIndex: number }
export interface BenchData { x: number; z: number; rotY: number }
export interface FenceData { x: number; z: number; rotY: number }
export interface SnowmanData { x: number; z: number; rotY: number }
export interface AnimalData { type: string; x: number; z: number; wanderR: number }
export type EditorTreeKind = 'pine' | 'tree' | 'appletree' | 'palm';
export interface TreeData { x: number; z: number; scale: number; rotY: number; kind: EditorTreeKind }
export interface CactusData { x: number; z: number; scale: number; rotY: number }
export interface PyramidData { x: number; z: number; r: number; h: number }

export interface LevelData {
  version: 1;
  level: LevelConfig;
  /** Road control polylines (CatmullRom centripetal, like the layout modules). */
  roads: [number, number][][];
  houses: HouseData[];
  lamps: [number, number][];
  benches: BenchData[];
  animals: AnimalData[];
  trees: TreeData[];
  bushes: [number, number][];
  flowers: [number, number][];
  barn?: [number, number];
  fencePosts: FenceData[];
  snowmen: SnowmanData[];
  pyramids: PyramidData[];
  cacti: CactusData[];
  /** Closed flight loop waypoints (desert only in the shipped levels). */
  flightWaypoints?: [number, number, number][];
}

export type AnyLayout = ValleyLayout | IslandLayout | MountainsLayout | SnowLayout | DesertLayout;

export const KNOWN_ANIMALS = ['dog', 'cat', 'chicken', 'sheep', 'cow', 'duck'] as const;
export const KNOWN_TREE_KINDS: EditorTreeKind[] = ['pine', 'tree', 'appletree', 'palm'];

// ---------- Terrain heights (pure, shared by editor and game) ----------

export function terrainHeightFor(worldType: WorldType, x: number, z: number): number {
  switch (worldType) {
    case 'valley':
      return valleyTerrainHeight(x, z);
    case 'island':
      return islandTerrainHeight(x, z);
    case 'mountains':
      return mountainTerrainHeight(x, z);
    case 'snow':
      return snowTerrainHeight(x, z);
    case 'desert':
      return desertTerrainHeight(x, z);
  }
}

// ---------- Procedural level -> LevelData (the 7 shipped levels) ----------

export function layoutToLevelData(levelId: string): LevelData {
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  const d: LevelData = {
    version: 1,
    level: { ...level, houseColors: [...level.houseColors] },
    roads: [],
    houses: [],
    lamps: [],
    benches: [],
    animals: [],
    trees: [],
    bushes: [],
    flowers: [],
    fencePosts: [],
    snowmen: [],
    pyramids: [],
    cacti: []
  };
  const t = level.worldType;

  if (t === 'valley') {
    const L = buildValleyLayout();
    d.roads = L.roads.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
    d.houses = L.houses.map((h) => ({ x: h.x, z: h.z, rotY: h.rotY, colorIndex: h.colorIndex }));
    d.lamps = L.lamps.map((p) => [p.x, p.z] as [number, number]);
    d.benches = L.benches.map((b) => ({ x: b.x, z: b.z, rotY: b.rotY }));
    d.animals = L.animals.map((a) => ({ type: a.type, x: a.x, z: a.z, wanderR: a.wanderR }));
    d.trees = L.trees.map((x) => ({ x: x.x, z: x.z, scale: x.scale, rotY: x.rotY, kind: x.kind as EditorTreeKind }));
    d.bushes = L.bushes.map((p) => [p.x, p.z] as [number, number]);
    d.flowers = L.flowers.map((p) => [p.x, p.z] as [number, number]);
    d.barn = L.barn ? [L.barn.x, L.barn.z] : undefined;
    d.fencePosts = L.fencePosts.map((f) => ({ x: f.x, z: f.z, rotY: f.rotY }));
  } else if (t === 'island') {
    const L = buildIslandLayout();
    d.roads = L.roads.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
    d.houses = L.houses.map((h) => ({ x: h.x, z: h.z, rotY: h.rotY, colorIndex: h.colorIndex }));
    d.lamps = L.lamps.map((p) => [p.x, p.z] as [number, number]);
    d.benches = L.benches.map((b) => ({ x: b.x, z: b.z, rotY: b.rotY }));
    d.animals = L.animals.map((a) => ({ type: a.type, x: a.x, z: a.z, wanderR: a.wanderR }));
    d.trees = L.trees.map((x) => ({
      x: x.x, z: x.z, scale: x.scale, rotY: x.rotY, kind: (x.palm ? 'palm' : 'tree') as EditorTreeKind
    }));
    d.bushes = L.bushes.map((p) => [p.x, p.z] as [number, number]);
    d.flowers = L.flowers.map((p) => [p.x, p.z] as [number, number]);
    d.barn = L.barn ? [L.barn.x, L.barn.z] : undefined;
    d.fencePosts = L.fencePosts.map((f) => ({ x: f.x, z: f.z, rotY: f.rotY }));
  } else if (t === 'mountains') {
    const L = buildMountainsLayout();
    d.roads = L.roads.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
    d.houses = L.houses.map((h) => ({ x: h.x, z: h.z, rotY: h.rotY, colorIndex: h.colorIndex }));
    d.lamps = L.lamps.map((p) => [p.x, p.z] as [number, number]);
    d.benches = L.benches.map((b) => ({ x: b.x, z: b.z, rotY: b.rotY }));
    d.animals = L.animals.map((a) => ({ type: a.type, x: a.x, z: a.z, wanderR: a.wanderR }));
    d.trees = L.trees.map((x) => ({
      x: x.x, z: x.z, scale: x.scale, rotY: x.rotY, kind: (x.pine ? 'pine' : 'tree') as EditorTreeKind
    }));
    d.bushes = L.bushes.map((p) => [p.x, p.z] as [number, number]);
    d.flowers = L.flowers.map((p) => [p.x, p.z] as [number, number]);
    d.barn = L.barn ? [L.barn.x, L.barn.z] : undefined;
    d.fencePosts = L.fencePosts.map((f) => ({ x: f.x, z: f.z, rotY: f.rotY }));
    d.snowmen = L.snowmen.map((s) => ({ x: s.x, z: s.z, rotY: s.rotY }));
  } else if (t === 'snow') {
    const L = buildSnowLayout();
    d.roads = L.roads.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
    d.houses = L.houses.map((h) => ({ x: h.x, z: h.z, rotY: h.rotY, colorIndex: h.colorIndex }));
    d.lamps = L.lamps.map((p) => [p.x, p.z] as [number, number]);
    d.animals = L.animals.map((a) => ({ type: a.type, x: a.x, z: a.z, wanderR: a.wanderR }));
    d.trees = L.pines.map((p) => ({ x: p.x, z: p.z, scale: p.scale, rotY: p.rotY, kind: 'pine' as EditorTreeKind }));
    d.snowmen = L.snowmen.map((s) => ({ x: s.x, z: s.z, rotY: s.rotY }));
  } else {
    // desert
    const L = buildDesertLayout();
    d.roads = L.roads.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
    d.houses = L.houses.map((h) => ({ x: h.x, z: h.z, rotY: h.rotY, colorIndex: h.colorIndex }));
    d.lamps = L.lamps.map((p) => [p.x, p.z] as [number, number]);
    d.animals = L.animals.map((a) => ({ type: a.type, x: a.x, z: a.z, wanderR: a.wanderR }));
    d.pyramids = L.pyramids.map((p) => ({ x: p.x, z: p.z, r: p.r, h: p.h }));
    d.cacti = L.cacti.map((c) => ({ x: c.x, z: c.z, scale: c.scale, rotY: c.rotY }));
    d.flightWaypoints = L.flightWaypoints.map((w) => [w[0], w[1], w[2]] as [number, number, number]);
  }
  return d;
}

// ---------- Blank level (new level in the editor) ----------

export function newLevelId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return slug || `novo-${Date.now().toString(36)}`;
}

export function blankLevelData(worldType: WorldType, name = 'Nova fase', id?: string): LevelData {
  const template = LEVELS.find((l) => l.worldType === worldType) ?? LEVELS[0];
  return {
    version: 1,
    level: { ...template, id: id ?? newLevelId(name), name, description: '', houseColors: [...template.houseColors] },
    roads: [],
    houses: [],
    lamps: [],
    benches: [],
    animals: [],
    trees: [],
    bushes: [],
    flowers: [],
    fencePosts: [],
    snowmen: [],
    pyramids: [],
    cacti: []
  };
}

// ---------- JSON -> LevelData (validation; unknown/garbage is dropped) ----------

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function numPair(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
}

function numTriple(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && isNum(v[0]) && isNum(v[1]) && isNum(v[2]);
}

export function normalizeLevelData(raw: unknown): LevelData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const level = (r.level ?? null) as Record<string, unknown> | null;
  const worldType = level && typeof level.worldType === 'string' ? (level.worldType as WorldType) : null;
  const worldTypes: WorldType[] = ['valley', 'island', 'mountains', 'snow', 'desert'];
  if (!worldType || !worldTypes.includes(worldType)) return null;

  // Base config: the shipped level with the same id, or the first one of this
  // world type. Everything else is merged on top (with type checks).
  const requestedId =
    typeof r.id === 'string' ? r.id : level && typeof level.id === 'string' ? level.id : '';
  const base = LEVELS.find((l) => l.id === requestedId) ??
    LEVELS.find((l) => l.worldType === worldType) ?? LEVELS[0];
  const merged: LevelConfig = { ...base, houseColors: [...base.houseColors], worldType, id: base.id, name: base.name };
  if (level) {
    if (typeof level.id === 'string' && level.id.trim()) merged.id = level.id.slice(0, 40);
    if (typeof level.name === 'string') merged.name = level.name.slice(0, 60);
    if (typeof level.description === 'string') merged.description = level.description.slice(0, 140);
    if (typeof level.emoji === 'string') merged.emoji = level.emoji.slice(0, 8);
    if (typeof level.skyDayTop === 'number') merged.skyDayTop = level.skyDayTop;
    if (typeof level.skyDayHorizon === 'number') merged.skyDayHorizon = level.skyDayHorizon;
    if (typeof level.groundColor === 'number') merged.groundColor = level.groundColor;
    if (typeof level.oceanDeep === 'number') merged.oceanDeep = level.oceanDeep;
    if (typeof level.oceanShallow === 'number') merged.oceanShallow = level.oceanShallow;
    if (typeof level.cycleSeconds === 'number') merged.cycleSeconds = level.cycleSeconds;
    if (typeof level.startNight === 'boolean') merged.startNight = level.startNight;
    if (typeof level.starCount === 'number') merged.starCount = level.starCount;
    if (typeof level.cloudCount === 'number') merged.cloudCount = level.cloudCount;
    if (Array.isArray(level.houseColors) && level.houseColors.every((c) => isNum(c)))
      merged.houseColors = level.houseColors.map((c) => c as number);
    if (level.vehicle === 'airplane' || level.vehicle === 'car' || level.vehicle === 'both') merged.vehicle = level.vehicle;
    if (typeof level.music === 'number') merged.music = level.music;
  }

  const roads = Array.isArray(r.roads)
    ? r.roads
        .filter((road) => Array.isArray(road) && road.length >= 2 && road.every(numPair))
        .map((road) => (road as [number, number][]).map((p) => [p[0], p[1]] as [number, number]))
    : [];

  const clean = (
    arr: unknown,
    ok: (o: Record<string, unknown>) => boolean
  ): Record<string, unknown>[] =>
    Array.isArray(arr) ? arr.filter((o) => o && typeof o === 'object' && ok(o as Record<string, unknown>)) : [];

  const xyz = (o: Record<string, unknown>) => isNum(o.x) && isNum(o.z);
  const houses = clean(r.houses, (o) =>
    xyz(o) && isNum(o.rotY) && isNum(o.colorIndex)
  ).map((o) => ({ x: o.x as number, z: o.z as number, rotY: o.rotY as number, colorIndex: o.colorIndex as number }));
  const lamps = Array.isArray(r.lamps) ? (r.lamps.filter(numPair) as [number, number][]) : [];
  const benches = clean(r.benches, (o) => xyz(o) && isNum(o.rotY)).map((o) => ({
    x: o.x as number, z: o.z as number, rotY: o.rotY as number
  }));
  const animals = clean(r.animals, (o) => xyz(o) && isNum(o.wanderR) && typeof o.type === 'string').map((o) => ({
    type: String(o.type), x: o.x as number, z: o.z as number, wanderR: o.wanderR as number
  }));
  const trees = clean(r.trees, (o) => xyz(o) && isNum(o.scale) && isNum(o.rotY) && typeof o.kind === 'string').map((o) => ({
    x: o.x as number, z: o.z as number, scale: o.scale as number, rotY: o.rotY as number,
    kind: (KNOWN_TREE_KINDS.includes(o.kind as EditorTreeKind) ? o.kind : 'tree') as EditorTreeKind
  }));
  const bushes = Array.isArray(r.bushes) ? (r.bushes.filter(numPair) as [number, number][]) : [];
  const flowers = Array.isArray(r.flowers) ? (r.flowers.filter(numPair) as [number, number][]) : [];
  const fencePosts = clean(r.fencePosts, (o) => xyz(o) && isNum(o.rotY)).map((o) => ({
    x: o.x as number, z: o.z as number, rotY: o.rotY as number
  }));
  const snowmen = clean(r.snowmen, (o) => xyz(o) && isNum(o.rotY)).map((o) => ({
    x: o.x as number, z: o.z as number, rotY: o.rotY as number
  }));
  const pyramids = clean(r.pyramids, (o) => xyz(o) && isNum(o.r) && isNum(o.h)).map((o) => ({
    x: o.x as number, z: o.z as number, r: o.r as number, h: o.h as number
  }));
  const cacti = clean(r.cacti, (o) => xyz(o) && isNum(o.scale) && isNum(o.rotY)).map((o) => ({
    x: o.x as number, z: o.z as number, scale: o.scale as number, rotY: o.rotY as number
  }));
  const barn = numPair(r.barn) ? (r.barn as [number, number]) : undefined;
  const flightWaypoints = Array.isArray(r.flightWaypoints)
    ? (r.flightWaypoints.filter(numTriple) as [number, number, number][])
    : undefined;

  return {
    version: 1,
    level: merged,
    roads,
    houses,
    lamps,
    benches,
    animals,
    trees,
    bushes,
    flowers,
    barn,
    fencePosts,
    snowmen,
    pyramids,
    cacti,
    flightWaypoints: flightWaypoints && flightWaypoints.length >= 3 ? flightWaypoints : undefined
  };
}

// ---------- LevelData -> layout objects (what the terrain classes consume) ----------
//
// The layout objects carry the computed y = terrainHeight(x, z) for every
// placed object (same contract as the procedural build*Layout()), plus the
// module-constant terrain fields (hills/dunes/peaks/waters) — the terrain
// shape itself stays procedural.

const hh = (wt: WorldType, x: number, z: number): number => terrainHeightFor(wt, x, z);

export function valleyLayoutFrom(data: LevelData): ValleyLayout {
  const h = (x: number, z: number) => hh('valley', x, z);
  return {
    seed: VALLEY_SEED,
    hills: VALLEY_HILLS,
    waters: VALLEY_WATERS.map((w) => ({ ...w })),
    roads: data.roads,
    houses: data.houses.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY, colorIndex: o.colorIndex })),
    lamps: data.lamps.map(([x, z]) => ({ x, z, y: h(x, z) })),
    benches: data.benches.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    farm: VALLEY_FARM,
    barn: data.barn ? { x: data.barn[0], z: data.barn[1], y: h(data.barn[0], data.barn[1]) } : undefined,
    fencePosts: data.fencePosts.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    animals: data.animals.map((o) => ({ ...o, y: h(o.x, o.z) })),
    trees: data.trees.map((o) => ({
      x: o.x, z: o.z, y: h(o.x, o.z), scale: o.scale, rotY: o.rotY,
      kind: (o.kind === 'palm' ? 'tree' : o.kind) as ValleyTreeKind
    })),
    bushes: data.bushes.map(([x, z]) => ({ x, z, y: h(x, z) })),
    flowers: data.flowers.map(([x, z]) => ({ x, z, y: h(x, z) }))
  };
}

export function islandLayoutFrom(data: LevelData): IslandLayout {
  const h = (x: number, z: number) => hh('island', x, z);
  return {
    seed: ISLAND_SEED,
    radius: ISLAND_RADIUS,
    mountains: mountainPositions(),
    waters: [{ ...ISLAND_LAGOON }],
    roads: data.roads,
    houses: data.houses.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY, colorIndex: o.colorIndex })),
    lamps: data.lamps.map(([x, z]) => ({ x, z, y: h(x, z) })),
    benches: data.benches.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    barn: data.barn ? { x: data.barn[0], z: data.barn[1], y: h(data.barn[0], data.barn[1]) } : undefined,
    fencePosts: data.fencePosts.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    animals: data.animals.map((o) => ({ ...o, y: h(o.x, o.z) })),
    trees: data.trees.map((o) => ({
      x: o.x, z: o.z, y: h(o.x, o.z), scale: o.scale, rotY: o.rotY, palm: o.kind === 'palm'
    })),
    bushes: data.bushes.map(([x, z]) => ({ x, z, y: h(x, z) })),
    flowers: data.flowers.map(([x, z]) => ({ x, z, y: h(x, z) }))
  };
}

export function mountainsLayoutFrom(data: LevelData): MountainsLayout {
  const h = (x: number, z: number) => hh('mountains', x, z);
  return {
    seed: MOUNTAIN_SEED,
    peaks: peakPositions(),
    waters: MOUNTAINS_WATERS.map((w) => ({ ...w })),
    roads: data.roads,
    houses: data.houses.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY, colorIndex: o.colorIndex })),
    lamps: data.lamps.map(([x, z]) => ({ x, z, y: h(x, z) })),
    benches: data.benches.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    barn: data.barn ? { x: data.barn[0], z: data.barn[1], y: h(data.barn[0], data.barn[1]) } : undefined,
    fencePosts: data.fencePosts.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    animals: data.animals.map((o) => ({ ...o, y: h(o.x, o.z) })),
    trees: data.trees.map((o) => ({
      x: o.x, z: o.z, y: h(o.x, o.z), scale: o.scale, rotY: o.rotY, pine: o.kind === 'pine'
    })),
    bushes: data.bushes.map(([x, z]) => ({ x, z, y: h(x, z) })),
    flowers: data.flowers.map(([x, z]) => ({ x, z, y: h(x, z) })),
    snowmen: data.snowmen.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY }))
  };
}

export function snowLayoutFrom(data: LevelData): SnowLayout {
  const h = (x: number, z: number) => hh('snow', x, z);
  return {
    seed: SNOW_SEED,
    hills: SNOW_HILLS,
    lake: { ...SNOW_LAKE },
    roads: data.roads,
    houses: data.houses.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY, colorIndex: o.colorIndex })),
    lamps: data.lamps.map(([x, z]) => ({ x, z, y: h(x, z) })),
    pines: data.trees.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), scale: o.scale, rotY: o.rotY })),
    snowmen: data.snowmen.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY })),
    animals: data.animals.map((o) => ({ ...o, y: h(o.x, o.z) }))
  };
}

export function desertLayoutFrom(data: LevelData): DesertLayout {
  const h = (x: number, z: number) => hh('desert', x, z);
  return {
    seed: DESERT_SEED,
    dunes: DESERT_DUNES,
    oasis: { ...DESERT_OASIS },
    roads: data.roads,
    houses: data.houses.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), rotY: o.rotY, colorIndex: o.colorIndex })),
    pyramids: data.pyramids.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), r: o.r, h: o.h })),
    cacti: data.cacti.map((o) => ({ x: o.x, z: o.z, y: h(o.x, o.z), scale: o.scale, rotY: o.rotY })),
    animals: data.animals.map((o) => ({ ...o, y: h(o.x, o.z) })),
    lamps: data.lamps.map(([x, z]) => ({ x, z, y: h(x, z) })),
    flightWaypoints: data.flightWaypoints ?? DESERT_FLIGHT_WAYPOINTS
  };
}

export function layoutFromData(worldType: WorldType, data: LevelData): AnyLayout {
  switch (worldType) {
    case 'valley':
      return valleyLayoutFrom(data);
    case 'island':
      return islandLayoutFrom(data);
    case 'mountains':
      return mountainsLayoutFrom(data);
    case 'snow':
      return snowLayoutFrom(data);
    case 'desert':
      return desertLayoutFrom(data);
  }
}

// ---------- Persistence helpers (localStorage; files are handled in main.ts) ----------

const LS_PREFIX = 'sofia:level:';

export function saveToLocalStorage(id: string, data: LevelData): void {
  try {
    localStorage.setItem(LS_PREFIX + id, JSON.stringify(data));
  } catch {
    /* storage full/blocked — the download fallback still works */
  }
}

export function loadFromLocalStorage(id: string): LevelData | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id);
    if (!raw) return null;
    return normalizeLevelData(JSON.parse(raw));
  } catch {
    return null;
  }
}
