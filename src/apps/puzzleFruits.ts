import type { PuzzleItem } from './PuzzleApp';

// 12 frutas (pelo menos 10), com as mesmas features dos demais quebra-
// cabeças: arrastar, encaixar, nome falado em pt-BR ao acertar. Frutas não
// têm som próprio — ao encaixar, só o nome é falado.
const BASE: Omit<PuzzleItem, 'speak'>[] = [
  { emoji: '🍎', name: 'Maçã' },
  { emoji: '🍌', name: 'Banana' },
  { emoji: '🍊', name: 'Laranja' },
  { emoji: '🍉', name: 'Melancia' },
  { emoji: '🍇', name: 'Uva' },
  { emoji: '🍓', name: 'Morango' },
  { emoji: '🍍', name: 'Abacaxi' },
  { emoji: '🥭', name: 'Manga' },
  { emoji: '🍐', name: 'Pera' },
  { emoji: '🍒', name: 'Cereja' },
  { emoji: '🥝', name: 'Kiwi' },
  { emoji: '🍑', name: 'Pêssego' },
];

export const FRUITS: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true }));
