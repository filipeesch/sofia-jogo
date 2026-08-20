import type { PuzzleItem } from './PuzzleApp';
import {
  carHorn,
  taxiDing,
  policeSiren,
  ambulanceSiren,
  fireSiren,
  truckHorn,
  busHorn,
  bikeBell,
  motorcycleRev,
  trainWhistle,
  airplaneEngine,
  helicopterWhup,
  rocketLaunch,
  boatHorn,
  tractorRumble,
} from '../ui/sfx';

// Nomes em pt-PT. Ao encaixar, cada veículo fala o próprio nome e, depois
// que a fala termina, toca o som do veículo (mesmo padrão dos animais).
// 'file' é a gravação real (public/sounds/); 'sound' é o fallback
// procedural usado só se o arquivo não carregar.
// O ⛵ mostra 'Veleiro' na tela, mas é falado como 'barco' ('spoken').
const BASE: Omit<PuzzleItem, 'speak' | 'soundAfter'>[] = [
  { emoji: '🚗', name: 'Carro', sound: carHorn, file: 'sounds/car.mp3' },
  { emoji: '🚕', name: 'Táxi', sound: taxiDing, file: 'sounds/taxi.mp3' },
  { emoji: '🚓', name: 'Polícia', sound: policeSiren, file: 'sounds/police.mp3' },
  { emoji: '🚑', name: 'Ambulância', sound: ambulanceSiren, file: 'sounds/ambulance.wav' },
  { emoji: '🚒', name: 'Bombeiro', sound: fireSiren, file: 'sounds/fire-truck.mp3' },
  { emoji: '🚛', name: 'Caminhão', sound: truckHorn, file: 'sounds/truck.mp3' },
  { emoji: '🚌', name: 'Autocarro', sound: busHorn, file: 'sounds/bus.mp3' },
  { emoji: '🚲', name: 'Bicicleta', sound: bikeBell, file: 'sounds/bike.mp3' },
  { emoji: '🏍️', name: 'Mota', sound: motorcycleRev, file: 'sounds/motorcycle.mp3' },
  { emoji: '🚂', name: 'Comboio', sound: trainWhistle, file: 'sounds/train.mp3' },
  { emoji: '✈️', name: 'Avião', sound: airplaneEngine, file: 'sounds/airplane.mp3' },
  { emoji: '🚁', name: 'Helicóptero', sound: helicopterWhup, file: 'sounds/helicopter.wav' },
  { emoji: '🚀', name: 'Foguete', sound: rocketLaunch, file: 'sounds/rocket.wav' },
  { emoji: '⛵', name: 'Veleiro', spoken: 'barco', sound: boatHorn, file: 'sounds/boat.mp3' },
  { emoji: '🚜', name: 'Trator', sound: tractorRumble, file: 'sounds/tractor.mp3' },
];

export const VEHICLES: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true, soundAfter: true }));
