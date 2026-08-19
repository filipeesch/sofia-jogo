import type { PuzzleItem } from './PuzzleApp';
import { bark, meow, cluck, baa, moo, quack, oink, neigh, roar, ribbit, hoot, crow } from '../ui/sfx';

// Nomes em pt-BR. 'file' é o som gravado (public/sounds/); 'sound' é o
// fallback procedural usado só se o arquivo não carregar.
// 'speak' + 'soundAfter': ao encaixar, o nome é falado em português e,
// depois que a fala termina, toca o som do animal.
const BASE: PuzzleItem[] = [
  { emoji: '🐶', name: 'Cachorro', sound: bark, file: 'sounds/dog.mp3' },
  { emoji: '🐱', name: 'Gato', sound: meow, file: 'sounds/cat.mp3' },
  { emoji: '🐔', name: 'Galinha', sound: cluck, file: 'sounds/chicken.mp3' },
  { emoji: '🐑', name: 'Ovelha', sound: baa, file: 'sounds/sheep.mp3' },
  { emoji: '🐮', name: 'Vaca', sound: moo, file: 'sounds/cow.mp3' },
  { emoji: '🦆', name: 'Pato', sound: quack, file: 'sounds/duck.mp3' },
  { emoji: '🐷', name: 'Porco', sound: oink, file: 'sounds/pig.mp3' },
  { emoji: '🐴', name: 'Cavalo', sound: neigh, file: 'sounds/horse.mp3' },
  { emoji: '🦁', name: 'Leão', sound: roar, file: 'sounds/lion.mp3' },
  { emoji: '🐸', name: 'Sapo', sound: ribbit, file: 'sounds/frog.mp3' },
  { emoji: '🦉', name: 'Coruja', sound: hoot, file: 'sounds/owl.mp3' },
  { emoji: '🐓', name: 'Galo', sound: crow, file: 'sounds/rooster.mp3' },
];

export const ANIMALS: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true, soundAfter: true }));
