import type { PuzzleItem } from './PuzzleApp';

// Nomes em pt-PT. Os veículos só falam o próprio nome (Web Speech API):
// o som do veículo (buzina, sirene…) foi substituído pela fala do nome.
// 'sound'/'file' foram removidos de propósito — nada toca além da fala.
const BASE: Omit<PuzzleItem, 'speak'>[] = [
  { emoji: '🚗', name: 'Carro' },
  { emoji: '🚕', name: 'Táxi' },
  { emoji: '🚓', name: 'Polícia' },
  { emoji: '🚑', name: 'Ambulância' },
  { emoji: '🚒', name: 'Bombeiro' },
  { emoji: '🚛', name: 'Caminhão' },
  { emoji: '🚌', name: 'Autocarro' },
  { emoji: '🚲', name: 'Bicicleta' },
  { emoji: '🏍️', name: 'Mota' },
  { emoji: '🚂', name: 'Comboio' },
  { emoji: '✈️', name: 'Avião' },
  { emoji: '🚁', name: 'Helicóptero' },
  { emoji: '🚀', name: 'Foguete' },
  { emoji: '⛵', name: 'Veleiro' },
  { emoji: '🚜', name: 'Trator' },
];

export const VEHICLES: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true }));
