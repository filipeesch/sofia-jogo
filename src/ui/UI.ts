// Minimal overlay: star counter + big touch-friendly buttons (sound, home, special).
export class UI {
  private counterEl: HTMLDivElement;
  private specialBtn: HTMLButtonElement;
  private soundBtn: HTMLButtonElement;

  constructor(onSpecial: () => void, onSoundToggle: () => void, onHome: () => void) {
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

    this.soundBtn = document.createElement('button');
    this.soundBtn.className = 'btn sound';
    this.soundBtn.textContent = '🔊';
    this.soundBtn.setAttribute('aria-label', 'Som');
    this.soundBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSoundToggle();
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

    root.append(this.counterEl, homeBtn, this.soundBtn, this.specialBtn);
  }

  setStars(n: number): void {
    this.counterEl.textContent = '⭐ ' + n;
    this.counterEl.classList.remove('pop');
    void this.counterEl.offsetWidth;
    this.counterEl.classList.add('pop');
  }

  setMuted(m: boolean): void {
    this.soundBtn.textContent = m ? '🔇' : '🔊';
  }
}
