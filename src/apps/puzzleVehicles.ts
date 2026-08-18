import type { PuzzleItem } from './PuzzleApp';
import { carHorn, taxiDing, policeSiren, ambulanceSiren, fireSiren, truckHorn, busHorn, bikeBell, motorcycleRev, trainWhistle, airplaneEngine, helicopterWhup, rocketLaunch, boatHorn, tractorRumble } from '../ui/sfx';

// 15 varied vehicles, toddler-friendly, each with a real recorded sound
// (public/sounds/). 'sound' is the procedural fallback; 'maxDur' caps the
// recording at 4 s where the source is longer.
export const VEHICLES: PuzzleItem[] = [
  { emoji: '🚗', name: 'Carro', sound: carHorn, file: 'sounds/car.mp3' },
  { emoji: '🚕', name: 'Táxi', sound: taxiDing, file: 'sounds/taxi.mp3' },
  { emoji: '🚓', name: 'Polícia', sound: policeSiren, file: 'sounds/police.mp3' },
  { emoji: '🚑', name: 'Ambulância', sound: ambulanceSiren, file: 'sounds/ambulance.mp3' },
  { emoji: '🚒', name: 'Bombeiro', sound: fireSiren, file: 'sounds/fire-truck.mp3', maxDur: 4 },
  { emoji: '🚛', name: 'Caminhão', sound: truckHorn, file: 'sounds/truck.mp3' },
  { emoji: '🚌', name: 'Ônibus', sound: busHorn, file: 'sounds/bus.mp3' },
  { emoji: '🚲', name: 'Bicicleta', sound: bikeBell, file: 'sounds/bike.mp3' },
  { emoji: '🏍️', name: 'Motocicleta', sound: motorcycleRev, file: 'sounds/motorcycle.mp3' },
  { emoji: '🚂', name: 'Trem', sound: trainWhistle, file: 'sounds/train.mp3' },
  { emoji: '✈️', name: 'Avião', sound: airplaneEngine, file: 'sounds/airplane.mp3', maxDur: 4 },
  { emoji: '🚁', name: 'Helicóptero', sound: helicopterWhup, file: 'sounds/helicopter.mp3', maxDur: 4 },
  { emoji: '🚀', name: 'Foguete', sound: rocketLaunch, file: 'sounds/rocket.mp3' },
  { emoji: '⛵', name: 'Veleiro', sound: boatHorn, file: 'sounds/boat.mp3' },
  { emoji: '🚜', name: 'Trator', sound: tractorRumble, file: 'sounds/tractor.mp3', maxDur: 4 },
];
