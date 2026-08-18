// Raw road control polylines per world kind. Single source of truth shared by
// rendering (src/world/Roads.ts) and the on-rails tour builder
// (src/rails/roadTour.ts). Each world's roads now live in that world's pure
// layout module (same data validated by the level auto-checks). This file
// imports the pure layout modules with explicit .ts extensions, which Node's
// type-stripping handles (the check scripts run in Node, where the
// extensionless imports of src/world/Roads.ts don't resolve).
import { MOUNTAINS_ROADS } from '../world/mountainsLayout.ts';
import { ISLAND_ROADS } from '../world/islandLayout.ts';
import { VALLEY_ROADS } from '../world/valleyLayout.ts';
import { SNOW_ROADS } from '../world/snowLayout.ts';
import { DESERT_ROADS } from '../world/desertLayout.ts';

export type RoadKind = 'valley' | 'snow' | 'desert' | 'mountains' | 'island';

export const ROAD_DEFS: Record<RoadKind, [number, number][][]> = {
  valley: VALLEY_ROADS,
  snow: SNOW_ROADS,
  desert: DESERT_ROADS,
  mountains: MOUNTAINS_ROADS,
  island: ISLAND_ROADS
};
