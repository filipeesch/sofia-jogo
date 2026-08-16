// Minimal overlay: star counter + big touch-friendly buttons (home, special).
export class UI {
  private counterEl: HTMLDivElement;
  private specialBtn: HTMLButtonElement;

  constructor(onSpecial: () => void, onHome: () => void) {
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
  }

  setStars(n: number): void {
    this.counterEl.textContent = '⭐ ' + n;
    this.counterEl.classList.remove('pop');
    void this.counterEl.offsetWidth;
    this.counterEl.classList.add('pop');
  }
}
