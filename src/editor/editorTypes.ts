// Shared types and constants for the map editor.

import type { LevelConfig, WorldType } from '../levels';
import type { WorldModels } from '../assets';
import type { LevelData, TreeData } from './levelData';

export interface EditorCallbacks {
  /** Open the real game (live mode) with this data. */
  onLive(d: LevelData, vehicle: 'car' | 'airplane'): void;
  /** Leave the editor (back to the launcher). */
  onExit(): void;
  /** Load the model set for a world type (cached by the caller). */
  loadWorldModels(wt: WorldType): Promise<WorldModels>;
}

export type Mode = 'select' | 'road' | 'delete' | 'place';

/** Every object category the editor can place / select / move. */
export type Category =
  | 'house' | 'lamp' | 'bench' | 'animal' | 'tree' | 'bush' | 'flower'
  | 'barn' | 'fence' | 'snowman' | 'pyramid' | 'cactus';

export type Sel =
  | { kind: 'object'; cat: Category; index: number }
  | { kind: 'road'; index: number };

/** A palette entry: which category (and tree kind) to place. */
export interface PlaceSpec {
  cat: Category;
  label: string;
  emoji: string;
  kind?: TreeData['kind'];
}

/** What a raycast against the editor scene hit. */
export type ScenePick =
  | { kind: 'handle'; road: number; point: number }
  | { kind: 'object'; cat: Category; index: number }
  | { kind: 'roadLine'; road: number }
  | { kind: 'ground'; x: number; z: number };

export const BOUND = 140; // max |x| / |z| where objects may be placed
export const ISLAND_BOUND = 70; // stay inside the island's beach ring

export const ANIMAL_META: Record<string, { emoji: string; label: string }> = {
  dog: { emoji: '🐶', label: 'Cachorro' },
  cat: { emoji: '🐱', label: 'Gato' },
  chicken: { emoji: '🐔', label: 'Galinha' },
  sheep: { emoji: '🐑', label: 'Ovelha' },
  cow: { emoji: '🐄', label: 'Vaca' },
  duck: { emoji: '🦆', label: 'Pato' }
};

export const TREE_KIND_META: Record<TreeData['kind'], { emoji: string; label: string }> = {
  pine: { emoji: '🌲', label: 'Pinheiro' },
  tree: { emoji: '🌳', label: 'Árvore' },
  appletree: { emoji: '🍎', label: 'Macedo' },
  palm: { emoji: '🌴', label: 'Palmeira' }
};

/** Tree kinds a world's layout actually renders. */
export const TREE_KINDS_FOR: Record<WorldType, TreeData['kind'][]> = {
  valley: ['pine', 'tree', 'appletree'],
  island: ['palm', 'tree'],
  mountains: ['pine', 'tree'],
  snow: ['pine'],
  desert: []
};

// Palette per world: only object types the world's layout actually renders.
export const PALETTES: Record<WorldType, PlaceSpec[]> = {
  valley: [
    { cat: 'house', label: 'Casa', emoji: '🏠' },
    { cat: 'barn', label: 'Celeiro', emoji: '🏚️' },
    { cat: 'lamp', label: 'Lâmpada', emoji: '💡' },
    { cat: 'bench', label: 'Banco', emoji: '🪑' },
    { cat: 'fence', label: 'Cerca', emoji: '🚧' },
    { cat: 'animal', label: 'Animal', emoji: '🐾' },
    { cat: 'tree', label: 'Pinheiro', emoji: '🌲', kind: 'pine' },
    { cat: 'tree', label: 'Árvore', emoji: '🌳', kind: 'tree' },
    { cat: 'tree', label: 'Macedo', emoji: '🍎', kind: 'appletree' },
    { cat: 'bush', label: 'Arbusto', emoji: '🌿' },
    { cat: 'flower', label: 'Flor', emoji: '🌸' }
  ],
  island: [
    { cat: 'house', label: 'Casa', emoji: '🏠' },
    { cat: 'barn', label: 'Celeiro', emoji: '🏚️' },
    { cat: 'lamp', label: 'Lâmpada', emoji: '💡' },
    { cat: 'bench', label: 'Banco', emoji: '🪑' },
    { cat: 'fence', label: 'Cerca', emoji: '🚧' },
    { cat: 'animal', label: 'Animal', emoji: '🐾' },
    { cat: 'tree', label: 'Palmeira', emoji: '🌴', kind: 'palm' },
    { cat: 'tree', label: 'Árvore', emoji: '🌳', kind: 'tree' },
    { cat: 'bush', label: 'Arbusto', emoji: '🌿' },
    { cat: 'flower', label: 'Flor', emoji: '🌸' }
  ],
  mountains: [
    { cat: 'house', label: 'Casa', emoji: '🏠' },
    { cat: 'barn', label: 'Celeiro', emoji: '🏚️' },
    { cat: 'lamp', label: 'Lâmpada', emoji: '💡' },
    { cat: 'bench', label: 'Banco', emoji: '🪑' },
    { cat: 'fence', label: 'Cerca', emoji: '🚧' },
    { cat: 'animal', label: 'Animal', emoji: '🐾' },
    { cat: 'tree', label: 'Pinheiro', emoji: '🌲', kind: 'pine' },
    { cat: 'tree', label: 'Árvore', emoji: '🌳', kind: 'tree' },
    { cat: 'snowman', label: 'Boneco', emoji: '⛄' },
    { cat: 'bush', label: 'Arbusto', emoji: '🌿' },
    { cat: 'flower', label: 'Flor', emoji: '🌸' }
  ],
  snow: [
    { cat: 'house', label: 'Casa', emoji: '🏠' },
    { cat: 'lamp', label: 'Lâmpada', emoji: '💡' },
    { cat: 'animal', label: 'Animal', emoji: '🐾' },
    { cat: 'tree', label: 'Pinheiro', emoji: '🌲', kind: 'pine' },
    { cat: 'snowman', label: 'Boneco', emoji: '⛄' }
  ],
  desert: [
    { cat: 'house', label: 'Casa', emoji: '🏠' },
    { cat: 'lamp', label: 'Lâmpada', emoji: '💡' },
    { cat: 'animal', label: 'Animal', emoji: '🐾' },
    { cat: 'cactus', label: 'Cacto', emoji: '🌵' },
    { cat: 'pyramid', label: 'Pirâmide', emoji: '🔺' }
  ]
};

export const NEW_LEVEL_MENU: [WorldType, string][] = [
  ['valley', '🌄 Vale'],
  ['island', '🌴 Ilha'],
  ['mountains', '⛰️ Montanhas'],
  ['snow', '❄️ Neve'],
  ['desert', '🏜️ Deserto']
];

/** Categories whose data has a rotY field. */
export const ROT_CATS: ReadonlySet<Category> = new Set<Category>([
  'house', 'bench', 'fence', 'snowman', 'tree', 'cactus'
]);

export type Vehicle = LevelConfig['vehicle'];
