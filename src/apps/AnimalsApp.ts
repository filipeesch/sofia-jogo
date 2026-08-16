import { bark, meow, cluck, baa, moo, quack, resume } from '../ui/sfx';

const ANIMALS: { emoji: string; name: string; sound: () => void }[] = [
  { emoji: '🐶', name: 'Cachorro', sound: bark },
  { emoji: '🐱', name: 'Gato', sound: meow },
  { emoji: '🐔', name: 'Galinha', sound: cluck },
  { emoji: '🐑', name: 'Ovelha', sound: baa },
  { emoji: '🐮', name: 'Vaca', sound: moo },
  { emoji: '🦆', name: 'Pato', sound: quack }
];

// Big tappable animal buttons that play their sound.
export class AnimalsApp {
  private root: HTMLDivElement;

  constructor(private onBack: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'animals';

    const title = document.createElement('h1');
    title.className = 'launcher-title';
    title.textContent = 'Sons dos Animais';

    const grid = document.createElement('div');
    grid.className = 'animals-grid';
    for (const a of ANIMALS) {
      const card = document.createElement('button');
      card.className = 'animal-card';
      const emoji = document.createElement('div');
      emoji.className = 'emoji';
      emoji.textContent = a.emoji;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = a.name;
      card.append(emoji, name);
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        resume();
        a.sound();
      });
      grid.append(card);
    }

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBack(); });

    this.root.append(title, grid, back);
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}
