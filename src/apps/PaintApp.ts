import { bark, meow, cluck, baa, moo, quack, popSound, tone, resume } from '../ui/sfx';

interface Stamp { emoji: string; label: string; sound: () => void }

const ANIMAL_STAMPS: Stamp[] = [
  { emoji: '🐶', label: 'Cachorro', sound: bark },
  { emoji: '🐱', label: 'Gato', sound: meow },
  { emoji: '🐔', label: 'Galinha', sound: cluck },
  { emoji: '🐑', label: 'Ovelha', sound: baa },
  { emoji: '🐮', label: 'Vaca', sound: moo },
  { emoji: '🦆', label: 'Pato', sound: quack },
];

const FUN_STAMPS: Stamp[] = [
  { emoji: '⭐', label: 'Estrela', sound: popSound },
  { emoji: '❤️', label: 'Coração', sound: popSound },
  { emoji: '🌈', label: 'Arco-íris', sound: popSound },
  { emoji: '☀️', label: 'Sol', sound: popSound },
  { emoji: '🌙', label: 'Lua', sound: popSound },
  { emoji: '🌸', label: 'Flor', sound: popSound },
  { emoji: '🦋', label: 'Borboleta', sound: popSound },
  { emoji: '🍎', label: 'Maçã', sound: popSound },
  { emoji: '⚽', label: 'Bola', sound: popSound },
  { emoji: '🚗', label: 'Carro', sound: popSound },
  { emoji: '✈️', label: 'Avião', sound: popSound },
  { emoji: '🎈', label: 'Balão', sound: popSound },
];

const COLORS = ['#ff5252', '#ff9800', '#ffd54a', '#66bb6a', '#42a5f5', '#7e57c2', '#ec407a', '#8d6e63', '#000000', '#ffffff', '#26c6da', '#ff6f91'];
const SIZES = [
  { label: 'Fino', w: 6, dot: 6 },
  { label: 'Médio', w: 14, dot: 12 },
  { label: 'Grosso', w: 30, dot: 20 },
];
const PAPERS = [
  { label: 'Branco', c: '#ffffff' },
  { label: 'Creme', c: '#fff7e6' },
  { label: 'Azul', c: '#eaf4ff' },
  { label: 'Rosa', c: '#ffeef3' },
  { label: 'Verde', c: '#ecffe8' },
];

// Toddler finger-painting: freehand brush, rainbow, eraser, emoji stamps + sounds.
export class PaintApp {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer = document.createElement('canvas');
  private buf: CanvasRenderingContext2D;

  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  private color = '#ff5252';
  private size = 14;
  private paper = '#ffffff';
  private tool: 'brush' | 'eraser' | 'rainbow' = 'brush';
  private stamp: Stamp | null = null;
  private hue = 0;

  private toolbar: HTMLDivElement;
  private colorRow: HTMLDivElement;
  private stampRow: HTMLDivElement;

  constructor(private onBack: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'paint';

    // --- top bar ---
    const top = document.createElement('div');
    top.className = 'paint-top';

    const back = document.createElement('button');
    back.className = 'paint-action paint-back';
    back.textContent = '🏠';
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBack(); });

    const title = document.createElement('div');
    title.className = 'paint-title';
    title.textContent = 'Pintura';

    const clear = document.createElement('button');
    clear.className = 'paint-action';
    clear.textContent = '🧽';
    clear.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.clearPage(); });

    const papers = document.createElement('div');
    papers.className = 'paint-papers';
    for (const p of PAPERS) {
      const b = document.createElement('button');
      b.className = 'paint-paper';
      b.style.background = p.c;
      b.title = p.label;
      if (p.c === this.paper) b.classList.add('active');
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.paper = p.c;
        papers.querySelectorAll('.paint-paper').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this.clearPage();
        tone(500, 0.06, 'sine', 0.12);
      });
      papers.append(b);
    }

    top.append(back, title, clear, papers);
    this.root.append(top);

    // --- canvas ---
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.buf = this.buffer.getContext('2d')!;

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      const p = this.point(e);
      this.lastX = p.x;
      this.lastY = p.y;
      if (this.stamp) {
        this.placeStamp(p.x, p.y);
        return;
      }
      this.drawing = true;
      this.dot(p.x, p.y);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing || this.stamp) return;
      const p = this.point(e);
      this.line(p.x, p.y);
    });
    const end = () => { this.drawing = false; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.root.append(this.canvas);

    // --- stamps ---
    this.stampRow = document.createElement('div');
    this.stampRow.className = 'paint-stamps';
    const allStamps = [...ANIMAL_STAMPS, ...FUN_STAMPS];
    for (const s of allStamps) {
      const b = document.createElement('button');
      b.className = 'paint-stamp';
      b.textContent = s.emoji;
      b.title = s.label;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        resume();
        s.sound();
        this.selectStamp(s, b);
      });
      this.stampRow.append(b);
    }
    this.root.append(this.stampRow);

    // --- bottom toolbar ---
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'paint-tools';

    const eraser = this.toolButton('🧹', 'Apagar', () => {
      this.tool = 'eraser';
      this.stamp = null;
      this.refreshActive();
    });
    eraser.classList.add('paint-eraser');

    const sizes = document.createElement('div');
    sizes.className = 'paint-sizes';
    for (const s of SIZES) {
      const b = document.createElement('button');
      b.className = 'paint-size';
      b.dataset.size = String(s.w);
      const dot = document.createElement('i');
      dot.style.width = s.dot + 'px';
      dot.style.height = s.dot + 'px';
      b.append(dot);
      if (s.w === this.size) b.classList.add('active');
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.size = s.w;
        if (this.tool === 'rainbow') this.tool = 'brush';
        sizes.querySelectorAll('.paint-size').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this.refreshActive();
        tone(440, 0.05, 'sine', 0.1);
      });
      sizes.append(b);
    }

    const rainbow = this.toolButton('🌈', 'Arco-íris', () => {
      this.tool = 'rainbow';
      this.stamp = null;
      this.refreshActive();
      tone(600, 0.1, 'triangle', 0.15, 900);
    });
    rainbow.classList.add('paint-rainbow');

    this.colorRow = document.createElement('div');
    this.colorRow.className = 'paint-colors';
    for (const c of COLORS) {
      const b = document.createElement('button');
      b.className = 'paint-color';
      b.style.background = c;
      if (c === '#ffffff') b.style.border = '2px solid #ccc';
      if (c === this.color) b.classList.add('active');
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.color = c;
        this.tool = 'brush';
        this.stamp = null;
        this.colorRow.querySelectorAll('.paint-color').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this.refreshActive();
        tone(520, 0.05, 'sine', 0.1);
      });
      this.colorRow.append(b);
    }

    this.toolbar.append(eraser, sizes, rainbow, this.colorRow);
    this.root.append(this.toolbar);

    this.refreshActive();
  }

  private toolButton(label: string, title: string, onTap: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'paint-tool-btn';
    b.textContent = label;
    b.title = title;
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); resume(); onTap(); });
    return b;
  }

  private selectStamp(s: Stamp, btn: HTMLButtonElement): void {
    this.stamp = s;
    this.tool = 'brush';
    this.stampRow.querySelectorAll('.paint-stamp').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    this.refreshActive();
  }

  private refreshActive(): void {
    const rainbow = this.toolbar.querySelector('.paint-rainbow');
    const eraser = this.toolbar.querySelector('.paint-eraser');
    rainbow?.classList.toggle('active', this.tool === 'rainbow');
    eraser?.classList.toggle('active', this.tool === 'eraser');
  }

  private point(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private currentColor(): string {
    if (this.tool === 'eraser') return this.paper;
    if (this.tool === 'rainbow') {
      this.hue = (this.hue + 12) % 360;
      return 'hsl(' + this.hue + ', 90%, 55%)';
    }
    return this.color;
  }

  private dot(x: number, y: number): void {
    this.buf.beginPath();
    this.buf.fillStyle = this.currentColor();
    this.buf.arc(x, y, this.size / 2, 0, Math.PI * 2);
    this.buf.fill();
    this.commit();
  }

  private line(x: number, y: number): void {
    this.buf.beginPath();
    this.buf.strokeStyle = this.currentColor();
    this.buf.lineWidth = this.size;
    this.buf.lineCap = 'round';
    this.buf.lineJoin = 'round';
    this.buf.moveTo(this.lastX, this.lastY);
    this.buf.lineTo(x, y);
    this.buf.stroke();
    this.commit();
    this.lastX = x;
    this.lastY = y;
  }

  private placeStamp(x: number, y: number): void {
    if (!this.stamp) return;
    this.buf.font = "64px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    this.buf.textAlign = 'center';
    this.buf.textBaseline = 'middle';
    this.buf.fillText(this.stamp.emoji, x, y);
    this.commit();
    resume();
    this.stamp.sound();
  }

  private commit(): void {
    this.ctx.drawImage(this.buffer, 0, 0);
  }

  private clearPage(): void {
    this.buf.fillStyle = this.paper;
    this.buf.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.commit();
    tone(300, 0.08, 'sine', 0.12, 500);
  }

  private resize = (): void => {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    const old = this.buffer.width > 0 ? this.buffer : null;
    this.canvas.width = w;
    this.canvas.height = h;
    this.buffer = document.createElement('canvas');
    this.buffer.width = w;
    this.buffer.height = h;
    this.buf = this.buffer.getContext('2d')!;
    this.buf.fillStyle = this.paper;
    this.buf.fillRect(0, 0, w, h);
    if (old) this.buf.drawImage(old, 0, 0);
    this.commit();
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
