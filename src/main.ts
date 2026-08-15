import './style.css';
import { Game } from './core/Game';
import { HomeScreen } from './ui/HomeScreen';
import { Airplane } from './entities/Airplane';
import { loadGLB, loadWorldModels } from './assets';
import { LEVELS } from './levels';
import type { Group } from 'three';

const app = document.getElementById('app')!;
let game: Game | null = null;

async function startLevel(id: string): Promise<void> {
  const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];

  // Keep the home screen visible while assets load (no blank flash).
  let airplane: Airplane;
  try {
    airplane = await Airplane.fromGLB('models/aviao.glb');
  } catch (err) {
    console.warn('Modelo aviao.glb nao carregou; usando aviao procedural.', err);
    airplane = new Airplane();
  }

  const models = await loadWorldModels(level.worldType);

  // Other airplanes flying in the background (reuse the same model).
  let ambientModel: Group | undefined;
  try {
    ambientModel = await loadGLB('models/aviao.glb');
  } catch (err) {
    console.warn('Nao carregou aviao de fundo.', err);
    ambientModel = undefined;
  }

  home.hide();
  game = new Game(app, level, airplane, models, ambientModel);
  game.onExit = () => backHome();
  game.start();
}

function backHome(): void {
  if (game) {
    game.dispose();
    game = null;
  }
  home.show();
}

const home = new HomeScreen(LEVELS, startLevel);
home.show();
