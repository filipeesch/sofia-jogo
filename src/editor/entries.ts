// Pure helpers over the LevelData object arrays: reading/writing entries of
// each category, their proxy bounding boxes, and the model key to use for
// rendering. No THREE, no DOM — just the save-file shape.

import type {
  AnimalData,
  CactusData,
  LevelData,
  PyramidData,
  TreeData
} from './levelData';
import type { Category } from './editorTypes';

/** All entries of a category. `barn` is a single optional tuple, wrapped. */
export function catArray(data: LevelData, cat: Category): unknown[] {
  switch (cat) {
    case 'house': return data.houses;
    case 'lamp': return data.lamps;
    case 'bench': return data.benches;
    case 'animal': return data.animals;
    case 'tree': return data.trees;
    case 'bush': return data.bushes;
    case 'flower': return data.flowers;
    case 'barn': return data.barn ? [data.barn] : [];
    case 'fence': return data.fencePosts;
    case 'snowman': return data.snowmen;
    case 'pyramid': return data.pyramids;
    case 'cactus': return data.cacti;
  }
}

export function entryFor(data: LevelData, cat: Category, index: number): unknown {
  return catArray(data, cat)[index];
}

/** [x, z] position of any entry. */
export function entryPos(cat: Category, entry: unknown): [number, number] {
  if (cat === 'lamp' || cat === 'bush' || cat === 'flower' || cat === 'barn') {
    const t = entry as [number, number];
    return [t[0], t[1]];
  }
  const o = entry as { x: number; z: number };
  return [o.x, o.z];
}

/** Write [x, z] into any entry (mutates in place; barn replaces the tuple). */
export function setPos(data: LevelData, cat: Category, index: number, x: number, z: number): void {
  switch (cat) {
    case 'house': { const o = data.houses[index]; o.x = x; o.z = z; break; }
    case 'lamp': { const t = data.lamps[index]; t[0] = x; t[1] = z; break; }
    case 'bench': { const o = data.benches[index]; o.x = x; o.z = z; break; }
    case 'animal': { const o = data.animals[index]; o.x = x; o.z = z; break; }
    case 'tree': { const o = data.trees[index]; o.x = x; o.z = z; break; }
    case 'bush': { const t = data.bushes[index]; t[0] = x; t[1] = z; break; }
    case 'flower': { const t = data.flowers[index]; t[0] = x; t[1] = z; break; }
    case 'barn': data.barn = [x, z]; break;
    case 'fence': { const o = data.fencePosts[index]; o.x = x; o.z = z; break; }
    case 'snowman': { const o = data.snowmen[index]; o.x = x; o.z = z; break; }
    case 'pyramid': { const o = data.pyramids[index]; o.x = x; o.z = z; break; }
    case 'cactus': { const o = data.cacti[index]; o.x = x; o.z = z; break; }
  }
}

/**
 * Rough pick-box size [radius, height] for an entry, used for the invisible
 * picking proxies and the drag ghost fallback.
 */
export function proxySize(cat: Category, entry: unknown): [number, number] {
  switch (cat) {
    case 'house': return [1.0, 3.4];
    case 'lamp': return [0.3, 3.6];
    case 'bench': return [0.55, 1.0];
    case 'animal': return [0.5, 1.4];
    case 'bush': return [0.6, 1.2];
    case 'flower': return [0.3, 0.9];
    case 'barn': return [1.2, 4.2];
    case 'fence': return [0.25, 1.2];
    case 'snowman': return [0.5, 2.6];
    case 'pyramid': {
      const p = entry as PyramidData;
      return [p.r, p.h];
    }
    case 'cactus': {
      const c = entry as CactusData;
      return [0.45 * c.scale, 2.2 * c.scale];
    }
    case 'tree': {
      const t = entry as TreeData;
      return [0.65 * t.scale, (t.kind === 'palm' ? 5 : 4) * t.scale];
    }
    default: return [1, 1];
  }
}

/** Which model in the WorldModels set renders this entry. */
export function modelKey(cat: Category, entry: unknown): string {
  switch (cat) {
    case 'animal': return (entry as AnimalData).type;
    case 'tree': return (entry as TreeData).kind;
    default: return cat;
  }
}
