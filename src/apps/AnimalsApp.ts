import { bark, meow, cluck, baa, moo, quack, oink, neigh, roar, ribbit, hoot, crow, thump, ding, win, resume } from '../ui/sfx';
import { preloadSound, playSound } from '../ui/sounds';

interface AnimalDef { emoji: string; name: string; sound: () => void; file: string }

// 'file' is a real recorded sound (public/sounds/); 'sound' is the
// procedural fallback used only if the file fails to load.
const ANIMALS: AnimalDef[] = [
  { emoji: '🐶', name: 'Cachorro', sound: bark, file: 'sounds/dog.mp3' },
  { emoji: '🐱', name: 'Gato', sound: meow, file: 'sounds/cat.mp3' },
  { emoji: '🐔', name: 'Galinha', sound: cluck, file: 'sounds/chicken.mp3' },
  { emoji: '🐑', name: 'Ovelha', sound: baa, file: 'sounds/sheep.mp3' },
  { emoji: '🐮', name: 'Vaca', sound: moo, file: 'sounds/cow.mp3' },
  { emoji: '🦆', name: 'Pato', sound: quack, file: 'sounds/duck.mp3' },
  { emoji: '🐷', name: 'Porco', sound: oink, file: 'sounds/pig.mp3' },
  { emoji: '🐴', name: 'Cavalo', sound: neigh, file: 'sounds/horse.mp3' },
  { emoji: '🦁', name: 'Leão', sound: roar, file: 'sounds/lion.mp3' },
  { emoji: '🐸', name: 'Sapo', sound: ribbit, file: 'sounds/frog.mp3' },
  { emoji: '🦉', name: 'Coruja', sound: hoot, file: 'sounds/owl.mp3' },
  { emoji: '🐓', name: 'Galo', sound: crow, file: 'sounds/rooster.mp3' },
];

// Generous tolerance around each slot (fraction of slot size), for toddler fingers.
const HIT_MARGIN = 0.3;
// Movement below this (px) counts as a tap, not a drag (tap never plays a sound).
const TAP_THRESHOLD = 10;

// Drag-and-drop matching puzzle: drag each animal from the tray onto its
// silhouette slot; the animal's sound plays only when it snaps into place.
// No score, no timer, no fail state (kid-friendly: there is no way to lose).
export class AnimalsApp {
  private root: HTMLDivElement;
  private board: HTMLDivElement;
  private tray: HTMLDivElement;
  private againBtn: HTMLButtonElement;
  private slots: HTMLDivElement[] = [];
  private pieces: HTMLButtonElement[] = [];
  private filled = 0;
  private drag: { piece: HTMLButtonElement; clone: HTMLDivElement; startX: number; startY: number; moved: boolean } | null = null;
  private timeouts: number[] = [];

  constructor(private onBack: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'animals';

    const title = document.createElement('h1');
    title.className = 'launcher-title';
    title.textContent = 'Quebra-Cabeça dos Animais';

    this.board = document.createElement('div');
    this.board.className = 'puzzle-board';
    this.board.setAttribute('aria-label', 'Quadro do quebra-cabeça');
    for (const a of ANIMALS) {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.dataset.animal = a.name;
      slot.setAttribute('aria-label', 'Posição do ' + a.name);
      const ghost = document.createElement('div');
      ghost.className = 'puzzle-ghost';
      ghost.textContent = a.emoji;
      ghost.setAttribute('aria-hidden', 'true');
      slot.append(ghost);
      this.board.append(slot);
      this.slots.push(slot);
    }

    this.tray = document.createElement('div');
    this.tray.className = 'puzzle-tray';
    this.tray.setAttribute('aria-label', 'Bandeja de animais');
    for (const a of ANIMALS) {
      const piece = document.createElement('button');
      piece.className = 'puzzle-piece';
      piece.dataset.animal = a.name;
      piece.setAttribute('aria-label', a.name);
      piece.textContent = a.emoji;
      piece.addEventListener('pointerdown', (e) => this.startDrag(e, piece));
      piece.addEventListener('pointermove', (e) => this.onDragMove(e));
      piece.addEventListener('pointerup', (e) => this.onDragEnd(e));
      piece.addEventListener('pointercancel', () => this.onDragCancel());
      this.tray.append(piece);
      this.pieces.push(piece);
    }

    this.againBtn = document.createElement('button');
    this.againBtn.className = 'puzzle-again';
    this.againBtn.textContent = 'Jogar de novo';
    this.againBtn.setAttribute('aria-label', 'Jogar de novo');
    this.againBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.playAgain(); });

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.setAttribute('aria-label', 'Voltar');
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBack(); });

    this.root.append(title, this.board, this.againBtn, this.tray, back);
    this.shuffleTray();
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    for (const a of ANIMALS) void preloadSound(a.file);
  }

  destroy(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.root.remove();
  }

  // Fisher-Yates shuffle of the tray pieces.
  private shuffleTray(): void {
    const order = [...this.pieces];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const p of order) this.tray.append(p);
  }

  private startDrag(e: PointerEvent, piece: HTMLButtonElement): void {
    if (piece.classList.contains('placed') || this.drag) return;
    e.preventDefault();
    resume();
    try { piece.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
    const clone = document.createElement('div');
    clone.className = 'puzzle-drag';
    clone.textContent = piece.textContent!;
    this.root.append(clone);
    this.positionClone(clone, e.clientX, e.clientY);
    piece.classList.add('held');
    this.drag = { piece, clone, startX: e.clientX, startY: e.clientY, moved: false };
  }

  private onDragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_THRESHOLD) d.moved = true;
    this.positionClone(d.clone, e.clientX, e.clientY);
  }

  private onDragEnd(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const { piece, clone } = d;
    if (!d.moved) {
      clone.remove();
      piece.classList.remove('held');
      return;
    }
    const slot = this.hitSlot(e.clientX, e.clientY);
    if (slot && slot.dataset.animal === piece.dataset.animal) {
      this.place(piece, slot, clone);
    } else {
      thump();
      this.returnPiece(piece, clone);
    }
  }

  private onDragCancel(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.clone.remove();
    d.piece.classList.remove('held');
  }

  private positionClone(clone: HTMLDivElement, x: number, y: number): void {
    clone.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(1.12)';
  }

  private hitSlot(x: number, y: number): HTMLDivElement | null {
    let best: HTMLDivElement | null = null;
    let bestDist = Infinity;
    for (const slot of this.slots) {
      if (slot.classList.contains('filled')) continue;
      const r = slot.getBoundingClientRect();
      const m = Math.max(r.width, r.height) * HIT_MARGIN;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) { bestDist = dist; best = slot; }
    }
    return best;
  }

  private place(piece: HTMLButtonElement, slot: HTMLDivElement, clone: HTMLDivElement): void {
    clone.remove();
    slot.append(piece);
    piece.classList.remove('held');
    piece.classList.add('placed');
    slot.classList.add('filled');
    const a = ANIMALS.find((x) => x.name === piece.dataset.animal)!;
    playSound(a.file, () => a.sound());
    ding();
    this.starburst(slot);
    this.filled++;
    if (this.filled === ANIMALS.length) this.celebrate();
  }

  private returnPiece(piece: HTMLButtonElement, clone: HTMLDivElement): void {
    const r = piece.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const start = getComputedStyle(clone).transform;
    const anim = clone.animate(
      [
        { transform: start },
        { transform: 'translate(' + cx + 'px, ' + cy + 'px) scale(1.05)' },
      ],
      { duration: 230, easing: 'ease-in', fill: 'forwards' }
    );
    anim.onfinish = () => {
      clone.remove();
      piece.classList.remove('held');
    };
    const t = window.setTimeout(() => {
      if (clone.isConnected) {
        clone.remove();
        piece.classList.remove('held');
      }
    }, 400);
    this.timeouts.push(t);
  }

  private starburst(slot: HTMLDivElement): void {
    const r = slot.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('span');
      s.className = 'puzzle-star';
      s.textContent = '⭐';
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 44 + Math.random() * 34;
      s.style.left = r.left + r.width / 2 + 'px';
      s.style.top = r.top + r.height / 2 + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      this.root.append(s);
      const t = window.setTimeout(() => s.remove(), 750);
      this.timeouts.push(t);
    }
  }

  private celebrate(): void {
    this.againBtn.classList.add('visible');
    win();
    const faces = ['🎉', '⭐', '🎊', '✨'];
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('span');
      s.className = 'puzzle-confetti';
      s.textContent = faces[i % faces.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = 16 + Math.random() * 20 + 'px';
      s.style.animationDelay = Math.random() * 0.5 + 's';
      this.root.append(s);
      const t = window.setTimeout(() => s.remove(), 3000);
      this.timeouts.push(t);
    }
  }

  private playAgain(): void {
    this.filled = 0;
    this.againBtn.classList.remove('visible');
    for (const slot of this.slots) slot.classList.remove('filled');
    for (const p of this.pieces) {
      p.classList.remove('placed');
      this.tray.append(p);
    }
    this.shuffleTray();
    ding();
  }
}
