import type { LevelConfig } from '../levels';

// Big, friendly level-select screen with large touch targets.
export class HomeScreen {
  private root: HTMLDivElement;

  constructor(levels: LevelConfig[], onSelect: (id: string) => void) {
    this.root = document.createElement('div');
    this.root.className = 'home';

    const title = document.createElement('h1');
    title.className = 'home-title';
    title.textContent = '🛩️ Avião Aventureiro';

    const subtitle = document.createElement('p');
    subtitle.className = 'home-subtitle';
    subtitle.textContent = 'Escolha uma fase para brincar';

    const grid = document.createElement('div');
    grid.className = 'home-grid';

    for (const lv of levels) {
      const card = document.createElement('button');
      card.className = 'home-card';
      card.setAttribute('aria-label', lv.name);

      const emoji = document.createElement('div');
      emoji.className = 'home-card-emoji';
      emoji.textContent = lv.emoji;

      const name = document.createElement('div');
      name.className = 'home-card-name';
      name.textContent = lv.name;

      const desc = document.createElement('div');
      desc.className = 'home-card-desc';
      desc.textContent = lv.description;

      card.append(emoji, name, desc);
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(lv.id);
      });
      grid.append(card);
    }

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'btn fullscreen';
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.setAttribute('aria-label', 'Tela cheia');
    fullscreenBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen();
      }
    });

    this.root.append(title, subtitle, grid, fullscreenBtn);
  }

  show(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
  }

  hide(): void {
    this.root.remove();
  }
}
