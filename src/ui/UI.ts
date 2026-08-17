// Minimal overlay: star counter + big touch-friendly buttons (home, special)
// + the on-rails / manual mode toggle.
export class UI {
  private counterEl: HTMLDivElement;
  private specialBtn: HTMLButtonElement;
  private modeBtn: HTMLButtonElement | null = null;

  constructor(
    onSpecial: () => void,
    onHome: () => void,
    opts: { railMode?: boolean; onToggleRail?: () => void } = {}
  ) {
    const root = document.getElementById('ui')!;
    root.innerHTML = '';

    this.counterEl = document.createElement('div');
    this.counterEl.className = 'counter';
    this.counterEl.textContent = '⭐ 0';

    this.specialBtn = document.createElement('button');
    this.specialBtn.className = 'btn special';
    this.specialBtn.textContent = '✨';
    this.specialBtn.setAttribute('aria-label', 'Ação especial');
    this.specialBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSpecial();
    });

    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn home';
    homeBtn.textContent = '🏠';
    homeBtn.setAttribute('aria-label', 'Voltar ao início');
    homeBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onHome();
    });

    root.append(this.counterEl, homeBtn, this.specialBtn);

    if (opts.onToggleRail) {
      this.modeBtn = document.createElement('button');
      this.modeBtn.className = 'mode-toggle';
      this.modeBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        opts.onToggleRail!();
      });
      root.append(this.modeBtn);
      this.setRailMode(opts.railMode ?? true);
    }
  }

  setStars(n: number): void {
    this.counterEl.textContent = '⭐ ' + n;
    this.counterEl.classList.remove('pop');
    void this.counterEl.offsetWidth;
    this.counterEl.classList.add('pop');
  }

  // Shows the current driving mode; pressing it switches to the other one.
  setRailMode(on: boolean): void {
    if (!this.modeBtn) return;
    this.modeBtn.textContent = on ? '🚂 Trilho' : '✋ Manual';
    this.modeBtn.setAttribute('aria-pressed', String(on));
    this.modeBtn.title = on ? 'Toque para pilotar manualmente (tecla T)' : 'Toque para voltar ao modo trilho (tecla T)';
  }
}
