// Raw road control polylines per world kind. Single source of truth shared by
// rendering (src/world/Roads.ts) and the on-rails tour builder
// (src/rails/roadTour.ts). Kept in its own module because the check scripts
// run in Node, where the extensionless imports of src/world/Roads.ts don't
// resolve — this file imports the pure layout modules with explicit .ts
// extensions, which Node's type-stripping handles.
import { MOUNTAINS_ROADS } from '../world/mountainsLayout.ts';
import { ISLAND_ROADS } from '../world/islandLayout.ts';

export type RoadKind = 'valley' | 'grid' | 'mountains' | 'island';

export const VALLEY_DEFS: [number, number][][] = [
  [[0, 0], [-15, 6], [-30, 16], [-50, 28], [-70, 40]],
  [[0, 0], [15, -8], [30, -16], [45, -13]],
  [[0, 0], [20, 12], [40, 26], [60, 40]],
  [[-70, 40], [-45, 55], [0, 58], [60, 40]]
];

export const GRID_DEFS: [number, number][][] = [
  [[-32, -15], [32, -15]],
  [[-32, 0], [32, 0]],
  [[-32, 15], [32, 15]],
  [[-18, -32], [-18, 32]],
  [[18, -32], [18, 32]]
];

export const ROAD_DEFS: Record<RoadKind, [number, number][][]> = {
  valley: VALLEY_DEFS,
  grid: GRID_DEFS,
  mountains: MOUNTAINS_ROADS,
  island: ISLAND_ROADS
};
