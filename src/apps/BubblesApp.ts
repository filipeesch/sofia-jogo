import { popSound, resume } from '../ui/sfx';

// Tap-to-pop bubbles that float up forever.
export class BubblesApp {
  private root: HTMLDivElement;
  private timer: number | null = null;

  constructor(private onBack: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'bubbles';

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBack(); });
    this.root.append(back);
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    this.startSpawning();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy(): void {
    this.stopSpawning();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.root.remove();
  }

  // Don't keep spawning bubbles while the screen is locked (Android) or the
  // tab is hidden.
  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.stopSpawning();
    else this.startSpawning();
  };

  private startSpawning(): void {
    if (this.timer === null) this.timer = window.setInterval(() => this.spawn(), 420);
  }

  private stopSpawning(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private spawn(): void {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 34 + Math.random() * 56;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = Math.random() * 92 + 'vw';
    b.style.bottom = '-80px';
    b.style.animation = 'floatUp ' + (4 + Math.random() * 3) + 's linear forwards';
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      resume();
      popSound();
      b.classList.add('pop');
      window.setTimeout(() => b.remove(), 200);
    });
    this.root.append(b);
  }
}
