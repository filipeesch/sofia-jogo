import type { PuzzleItem } from './PuzzleApp';

// Números 0–9. Ao encaixar, o número é falado em pt-PT
// (mesmo padrão dos animais/veículos: só fala, sem som próprio).
const BASE: Omit<PuzzleItem, 'speak'>[] = [
  { emoji: '0', name: 'Zero', spoken: 'Zero' },
  { emoji: '1', name: 'Um', spoken: 'Um' },
  { emoji: '2', name: 'Dois', spoken: 'Dois' },
  { emoji: '3', name: 'Três', spoken: 'Três' },
  { emoji: '4', name: 'Quatro', spoken: 'Quatro' },
  { emoji: '5', name: 'Cinco', spoken: 'Cinco' },
  { emoji: '6', name: 'Seis', spoken: 'Seis' },
  { emoji: '7', name: 'Sete', spoken: 'Sete' },
  { emoji: '8', name: 'Oito', spoken: 'Oito' },
  { emoji: '9', name: 'Nove', spoken: 'Nove' },
];

export const NUMBERS: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true }));
