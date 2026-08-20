import type { PuzzleItem } from './PuzzleApp';

// Letras A–Z. Ao encaixar, a letra é falada em pt-PT
// (mesmo padrão dos animais/veículos: só fala, sem som próprio).
const BASE: Omit<PuzzleItem, 'speak'>[] = [
  { emoji: 'A', name: 'A', spoken: 'A' },
  { emoji: 'B', name: 'Bê', spoken: 'Bê' },
  { emoji: 'C', name: 'Cê', spoken: 'Cê' },
  { emoji: 'D', name: 'Dê', spoken: 'Dê' },
  { emoji: 'E', name: 'E', spoken: 'E' },
  { emoji: 'F', name: 'Fê', spoken: 'Fê' },
  { emoji: 'G', name: 'Gê', spoken: 'Gê' },
  { emoji: 'H', name: 'Há', spoken: 'Há' },
  { emoji: 'I', name: 'I', spoken: 'I' },
  { emoji: 'J', name: 'Jota', spoken: 'Jota' },
  { emoji: 'K', name: 'Cá', spoken: 'Cá' },
  { emoji: 'L', name: 'El', spoken: 'El' },
  { emoji: 'M', name: 'Em', spoken: 'Em' },
  { emoji: 'N', name: 'En', spoken: 'En' },
  { emoji: 'O', name: 'O', spoken: 'O' },
  { emoji: 'P', name: 'Pê', spoken: 'Pê' },
  { emoji: 'Q', name: 'Qué', spoken: 'Qué' },
  { emoji: 'R', name: 'Erre', spoken: 'Erre' },
  { emoji: 'S', name: 'Esse', spoken: 'Esse' },
  { emoji: 'T', name: 'Tê', spoken: 'Tê' },
  { emoji: 'U', name: 'U', spoken: 'U' },
  { emoji: 'V', name: 'Vê', spoken: 'Vê' },
  { emoji: 'W', name: 'Dábliu', spoken: 'Dábliu' },
  { emoji: 'X', name: 'Xis', spoken: 'Xis' },
  { emoji: 'Y', name: 'Ipsilon', spoken: 'Ipsilon' },
  { emoji: 'Z', name: 'Zê', spoken: 'Zê' },
];

export const LETTERS: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true }));
