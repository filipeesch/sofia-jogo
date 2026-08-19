import { thump, ding, win, resume } from '../ui/sfx';
import { preloadSound, playSound } from '../ui/sounds';
import { speakName } from '../ui/speech';

// One puzzle item: emoji face, pt-BR name, optional procedural fallback sound
// and optional real MP3 (public/sounds/). 'maxDur' caps the recording length
// (seconds) at decode time.
//
// Audio behaviour (kid-friendly, set per puzzle):
//   speak      – say the item's name out loud (Web Speech API, pt-BR)
//   soundAfter – play the item's recorded sound *after* the name finishes
// Animals use both (name, then animal sound); vehicles and fruits speak the
// name only (no recorded sound).
export interface PuzzleItem {
  emoji: string;
  name: string;
  sound?: () => void;
  file?: string;
  maxDur?: number;
  speak?: boolean;
  soundAfter?: boolean;
}

export interface PuzzleOptions {
  title: string;
  items: PuzzleItem[];
  onBack: () => void;
}

// How far (as a fraction of the slot size) the drop point may be from the
// CENTER OF THE PIECE'S OWN SLOT and still snap. Deliberately very generous:
// a toddler aims at the silhouette of the item she holds, not at a slot.
const SNAP_RADIUS = 1.05;
// Movement below this (px) counts as a tap, not a drag (tap never plays a sound).
const TAP_THRESHOLD = 10;

// Generic drag-and-drop matching puzzle: drag each piece from the tray onto
// its silhouette slot; the item's sound plays only when it snaps into place.
// No score, no timer, no fail state (kid-friendly: there is no way to lose).
// Shared by the animals puzzle and the vehicles puzzle.
export class PuzzleApp {
  private root: HTMLDivElement;
  private board: HTMLDivElement;
  private tray: HTMLDivElement;
  private againBtn: HTMLButtonElement;
  private slots: HTMLDivElement[] = [];
  private pieces: HTMLButtonElement[] = [];
  private filled = 0;
  private drag: { piece: HTMLButtonElement; clone: HTMLDivElement; startX: number; startY: number; moved: boolean } | null = null;
  private timeouts: number[] = [];

  constructor(private opts: PuzzleOptions) {
    this.root = document.createElement('div');
    this.root.className = 'animals';

    const title = document.createElement('h1');
    title.className = 'launcher-title';
    title.textContent = opts.title;

    this.board = document.createElement('div');
    this.board.className = 'puzzle-board';
    this.board.style.gridTemplateColumns = 'repeat(' + (opts.items.length > 12 ? 5 : 4) + ', auto)';
    this.board.setAttribute('aria-label', 'Quadro do quebra-cabeça');
    for (const a of opts.items) {
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
    this.tray.setAttribute('aria-label', 'Bandeja de peças');
    for (const a of opts.items) {
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
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.opts.onBack(); });

    this.root.append(title, this.board, this.againBtn, this.tray, back);
    this.shuffleSlots();
    this.shuffleTray();
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    for (const a of this.opts.items) {
      if (a.file) void preloadSound(a.file, a.maxDur);
    }
  }

  destroy(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.root.remove();
  }

  // Fisher-Yates shuffle of the TRAY pieces; repeats until the resulting
  // order visibly differs from the current one (kids notice when
  // "Jogar de novo" leaves every piece where it was).
  private shuffleTray(): void {
    const current = Array.from(this.tray.children).map((el) => (el as HTMLElement).dataset.animal).join('|');
    let order = this.fisherYates(this.pieces);
    for (let tries = 0; tries < 8 && order.map((p) => p.dataset.animal).join('|') === current; tries++) {
      order = this.fisherYates(this.pieces);
    }
    for (const p of order) this.tray.append(p);
  }

  // Fisher-Yates shuffle of the BOARD SLOTS: the top grid (where pieces snap
  // in) is rearranged too, so the silhouettes are never in a fixed order —
  // each round the kid has to scan the whole board to find each home.
  private shuffleSlots(): void {
    const current = this.slots.map((s) => s.dataset.animal).join('|');
    let order = this.fisherYates(this.slots);
    for (let tries = 0; tries < 8 && order.map((s) => s.dataset.animal).join('|') === current; tries++) {
      order = this.fisherYates(this.slots);
    }
    for (const s of order) this.board.append(s);
  }

  private fisherYates<T>(arr: T[]): T[] {
    const order = [...arr];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
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
    // Simplified rule: snap if the drop point is close to the piece's OWN
    // slot — no "nearest slot" comparison, so an adjacent slot can never
    // steal a nearly-correct drop.
    const slot = this.slots.find((s) => s.dataset.animal === piece.dataset.animal)!;
    const r = slot.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (dist <= Math.max(r.width, r.height) * SNAP_RADIUS) {
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
    clone.style.transform = 'translate(calc(' + x + 'px - 50%), calc(' + y + 'px - 50%)) scale(1.12)';
  }

  private place(piece: HTMLButtonElement, slot: HTMLDivElement, clone: HTMLDivElement): void {
    clone.remove();
    slot.append(piece);
    piece.classList.remove('held');
    piece.classList.add('placed');
    slot.classList.add('filled');
    const a = this.opts.items.find((x) => x.name === piece.dataset.animal)!;
    ding();
    this.starburst(slot);
    this.filled++;
    this.playItemSound(a);
    if (this.filled === this.opts.items.length) this.celebrate();
  }

  // Item audio when a piece snaps in:
  //   - 'speak':      the name is said out loud in pt-BR (Web Speech API)
  //   - 'soundAfter': the recorded MP3 plays right after the name ends
  // Animals: name + animal sound. Vehicles / fruits: name only.
  private playItemSound(a: PuzzleItem): void {
    const playFile = (): void => {
      if (a.file) playSound(a.file, () => { a.sound?.(); });
    };
    if (a.speak) {
      speakName(a.name, () => {
        if (a.soundAfter) playFile();
      });
    } else {
      playFile();
    }
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
    this.shuffleSlots();
    this.shuffleTray();
    ding();
  }
}
