// Simple finger-painting app (2D canvas).
export class PaintApp {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private color = '#ff5252';
  private lineWidth = 16;

  constructor(private onBack: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'paint';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.drawing = true;
      this.canvas.setPointerCapture(e.pointerId);
      const p = this.point(e);
      this.lastX = p.x;
      this.lastY = p.y;
      this.dot(p.x, p.y);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const p = this.point(e);
      this.line(p.x, p.y);
    });
    const end = () => { this.drawing = false; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    const toolbar = document.createElement('div');
    toolbar.className = 'paint-toolbar';
    const colors = ['#ff5252', '#ff9800', '#ffd54a', '#4caf50', '#42a5f5', '#9c27b0', '#000000', '#ffffff'];
    for (const c of colors) {
      const b = document.createElement('button');
      b.className = 'paint-color';
      b.style.background = c;
      if (c === this.color) b.classList.add('active');
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.color = c;
        toolbar.querySelectorAll('.paint-color').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      toolbar.append(b);
    }
    const clear = document.createElement('button');
    clear.className = 'paint-action';
    clear.textContent = '🧽 Limpar';
    clear.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.fillWhite(); });
    toolbar.append(clear);
    const back = document.createElement('button');
    back.className = 'paint-action';
    back.textContent = '🏠';
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBack(); });
    toolbar.append(back);

    this.root.append(this.canvas, toolbar);
  }

  private point(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private fillWhite(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private dot(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.fillStyle = this.color;
    this.ctx.arc(x, y, this.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private line(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  }

  private resize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 76;
    this.fillWhite();
  };

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.root.remove();
  }
}
