import './style.css';
import { Game } from './core/Game';
import { Launcher } from './ui/Launcher';
import { HomeScreen } from './ui/HomeScreen';
import { PaintApp } from './apps/PaintApp';
import { BubblesApp } from './apps/BubblesApp';
import { AnimalsApp } from './apps/AnimalsApp';
import { Airplane } from './entities/Airplane';
import { Car } from './entities/Car';
import { FlightController } from './controllers/FlightController';
import { CarController } from './controllers/CarController';
import { loadGLB, loadWorldModels } from './assets';
import { LEVELS } from './levels';
import type { LevelConfig } from './levels';
import type { Vehicle, VehicleController } from './entities/Vehicle';

const app = document.getElementById('app')!;
let game: Game | null = null;
let currentApp: { destroy: () => void } | null = null;

const launcher = new Launcher([
  { id: 'aviao', emoji: '✈️', name: 'Avião', color: 'linear-gradient(135deg,#ffb74d,#ff8a65)', onOpen: () => openLevelSelect('airplane') },
  { id: 'carro', emoji: '🚗', name: 'Carro', color: 'linear-gradient(135deg,#ff6f91,#ff3d6e)', onOpen: () => openLevelSelect('car') },
  { id: 'pintura', emoji: '🎨', name: 'Pintura', color: 'linear-gradient(135deg,#7ae07a,#3cbf5a)', onOpen: openPaint },
  { id: 'bolhas', emoji: '🫧', name: 'Bolhas', color: 'linear-gradient(135deg,#4fc3f7,#0288d1)', onOpen: openBubbles },
  { id: 'sons', emoji: '🐶', name: 'Quebra-Cabeça', color: 'linear-gradient(135deg,#d1a6ff,#9c27b0)', onOpen: openAnimals }
]);

function clearAll(): void {
  if (game) {
    game.dispose();
    game = null;
  }
  if (currentApp) {
    currentApp.destroy();
    currentApp = null;
  }
  document.getElementById('ui')!.innerHTML = '';
}

function openLevelSelect(vehicleType: 'airplane' | 'car'): void {
  clearAll();
  const levels = vehicleType === 'car' ? LEVELS.filter((l) => l.vehicle !== 'airplane') : LEVELS;
  const levelSelect = new HomeScreen(levels, (id) => void startLevel(id, vehicleType));
  levelSelect.show();
}

function openPaint(): void {
  clearAll();
  const a = new PaintApp(() => { clearAll(); launcher.show(); });
  currentApp = a;
  a.mount();
}

function openBubbles(): void {
  clearAll();
  const a = new BubblesApp(() => { clearAll(); launcher.show(); });
  currentApp = a;
  a.mount();
}

function openAnimals(): void {
  clearAll();
  const a = new AnimalsApp(() => { clearAll(); launcher.show(); });
  currentApp = a;
  a.mount();
}

async function startLevel(id: string, vehicleType: 'airplane' | 'car'): Promise<void> {
  const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];

  let vehicle: Vehicle;
  let controller: VehicleController;
  if (vehicleType === 'airplane') {
    let ap: Airplane;
    try { ap = await Airplane.fromGLB('models/aviao.glb'); } catch { ap = new Airplane(); }
    vehicle = ap;
    controller = new FlightController(ap);
  } else {
    let c: Car;
    try { c = await Car.fromGLB('models/car.glb'); } catch { c = new Car(); }
    vehicle = c;
    controller = new CarController(c);
  }

  const models = await loadWorldModels(level.worldType);
  let ambientModel: import('three').Group | undefined;
  try { ambientModel = await loadGLB('models/aviao.glb'); } catch { ambientModel = undefined; }

  game = new Game(app, level, vehicle, controller, models, ambientModel, vehicleType);
  game.onExit = () => { game!.dispose(); game = null; launcher.show(); };
  game.start();
}

function resolveVehicle(level: LevelConfig, param: string | null): 'airplane' | 'car' {
  const airplaneOnly = level.vehicle === 'airplane';
  return param === 'airplane' || airplaneOnly ? 'airplane' : 'car';
}

function boot(): void {
  const params = new URLSearchParams(window.location.search);
  const levelId = params.get('level');
  if (!levelId) {
    launcher.show();
    return;
  }
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  void startLevel(level.id, resolveVehicle(level, params.get('vehicle')));
}

// Troca de fase em runtime (usada pela tool MCP `load_level`), sem recarregar a página.
(window as unknown as Record<string, unknown>).__loadLevel = (levelId: string, vehicleParam?: string) => {
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  const vt = resolveVehicle(level, vehicleParam ?? null);
  const url = new URL(window.location.href);
  url.searchParams.set('debug', '1');
  url.searchParams.set('level', level.id);
  url.searchParams.set('vehicle', vt);
  window.history.replaceState(null, '', url);
  clearAll();
  void startLevel(level.id, vt);
};

boot();

// PWA service worker (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
