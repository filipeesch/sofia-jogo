import './style.css';
import { Game } from './core/Game';
import { HomeScreen } from './ui/HomeScreen';
import { LEVELS } from './levels';

const app = document.getElementById('app')!;
let game: Game | null = null;

function startLevel(id: string): void {
  const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
  home.hide();
  game = new Game(app, level);
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
