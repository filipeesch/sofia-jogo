import './style.css';
import { Game } from './core/Game';
import { HomeScreen } from './ui/HomeScreen';
import { Airplane } from './entities/Airplane';
import { LEVELS } from './levels';

const app = document.getElementById('app')!;
let game: Game | null = null;

async function startLevel(id: string): Promise<void> {
  const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
  home.hide();
  let airplane: Airplane;
  try {
    // Cartoon model authored in Blender; procedural fallback keeps the game
    // playable even if the model is missing.
    airplane = await Airplane.fromGLB('models/aviao.glb');
  } catch (err) {
    console.warn('Modelo aviao.glb nao carregou; usando aviao procedural.', err);
    airplane = new Airplane();
  }
  game = new Game(app, level, airplane);
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
