// Kid-friendly "OS" home screen: a grid of app icons + fullscreen button.
export class Launcher {
  private root: HTMLDivElement;

  constructor(apps: { id: string; emoji: string; name: string; color: string; onOpen: () => void }[]) {
    this.root = document.createElement('div');
    this.root.className = 'launcher';

    const title = document.createElement('h1');
    title.className = 'launcher-title';
    title.textContent = 'Meus Joguinhos';

    const grid = document.createElement('div');
    grid.className = 'launcher-grid';

    for (const a of apps) {
      const card = document.createElement('button');
      card.className = 'app-card';
      card.style.background = a.color;
      card.setAttribute('aria-label', a.name);

      const emoji = document.createElement('div');
      emoji.className = 'app-card-emoji';
      emoji.textContent = a.emoji;

      const name = document.createElement('div');
      name.className = 'app-card-name';
      name.textContent = a.name;

      card.append(emoji, name);
      // `click` e não `pointerdown`: com o launcher rolável, o toque tem de
      // abrir só se foi um toque a sério — o browser cancela o click quando o
      // gesto se transformou num arrasto de scroll.
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        a.onOpen();
      });
      grid.append(card);
    }

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'btn fullscreen';
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.setAttribute('aria-label', 'Tela cheia');
    fullscreenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen();
      }
    });

    this.root.append(title, grid, fullscreenBtn);
  }

  show(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    // A página vive com touch-action:none para trancar os gestos dos jogos;
    // só enquanto o launcher está na frente é que o pan vertical é permitido.
    document.documentElement.classList.add('launcher-touch');
  }
}
