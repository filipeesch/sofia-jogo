import './games.css';
import { ANIMALS } from './puzzleAnimals';
import type { PuzzleItem } from './PuzzleApp';
import { preloadSound, playSound } from '../ui/sounds';
import { cancelSpeech, speakName } from '../ui/speech';
import { clique, ding, win } from '../ui/sfx';

// Jogo da Memória: pares de animais virados para baixo; ao revelar, o nome é
// falado em pt-PT e, quando há gravação, o som do bicho toca a seguir (a mesma
// cadeia speak + soundAfter dos quebra-cabeças). O adulto escolhe o tamanho do
// tabuleiro no topo (2x3/3x4/4x5); sem pontuação, sem cronómetro, sem "errou":
// o par errado fecha com um clique suave e as cartas ficam abertas o tempo
// suficiente para a criança as ver.

export interface MemoryOptions {
  onBack: () => void;
}

type GridSize = '2x3' | '3x4' | '4x5';

const GRID_CELLS: Record<GridSize, number> = { '2x3': 6, '3x4': 12, '4x5': 20 };
const GRID_LABELS: [GridSize, string][] = [
  ['2x3', '🐣 2x3'],
  ['3x4', '🐥 3x4'],
  ['4x5', '🐔 4x5']
];
const LS_KEY = 'sofia.mem.grid';
// Quanto tempo o par errado fica aberto para a criança ver onde estava.
const MISMATCH_MS = 1000;

interface MemCard {
  item: PuzzleItem;
  el: HTMLButtonElement;
  up: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class MemoryApp {
  private root: HTMLDivElement;
  private stage: HTMLDivElement;
  private board: HTMLDivElement;
  private againBtn: HTMLButtonElement;
  private segBtns = new Map<GridSize, HTMLButtonElement>();

  private size: GridSize;
  private cards: MemCard[] = [];
  private first: MemCard | null = null;
  private locked = false;
  private matchedPairs = 0;
  private lastLayout: number[] | null = null;
  private timeouts: number[] = [];
  private ro: ResizeObserver | null = null;

  constructor(private opts: MemoryOptions) {
    this.size = readGrid();

    this.root = document.createElement('div');
    this.root.className = 'game game-memoria';

    // Cabeçalho: 🏠 + título + espaçador para o título ficar centrado
    // (o mesmo arranjo do puzzle).
    const head = document.createElement('div');
    head.className = 'game-head';

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.setAttribute('aria-label', 'Voltar');
    back.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      cancelSpeech(); // o nome em curso não pode continuar por cima do launcher
      this.opts.onBack();
    });

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.textContent = 'Jogo da Memória';

    const spacer = document.createElement('div');
    spacer.className = 'game-head-space';
    head.append(back, title, spacer);

    // Seletor de tamanho: escolha do adulto; trocar = recomeço imediato.
    const seg = document.createElement('div');
    seg.className = 'game-seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Tamanho do tabuleiro');
    for (const [size, label] of GRID_LABELS) {
      const b = document.createElement('button');
      b.className = 'game-seg-btn';
      b.textContent = label;
      b.setAttribute('aria-label', `${GRID_CELLS[size] / 2} pares`);
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (size === this.size) return;
        this.size = size;
        writeGrid(size);
        this.markSeg();
        this.newGame();
      });
      this.segBtns.set(size, b);
      seg.append(b);
    }

    this.stage = document.createElement('div');
    this.stage.className = 'game-stage';

    this.board = document.createElement('div');
    this.board.className = 'mem-board';

    this.againBtn = document.createElement('button');
    this.againBtn.className = 'game-again';
    this.againBtn.textContent = 'Jogar de novo';
    this.againBtn.setAttribute('aria-label', 'Jogar de novo');
    this.againBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.newGame();
    });

    this.stage.append(this.board, this.againBtn);
    this.root.append(head, seg, this.stage);
    this.markSeg();
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    // As gravações são as mesmas dos quebra-cabeças: pré-carrega as 12,
    // qualquer que seja o sorteio.
    for (const a of ANIMALS) if (a.file) void preloadSound(a.file, a.maxDur);
    this.newGame();
    this.observeViewport();
  }

  destroy(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.stopObserving();
    this.root.remove();
  }

  // ---- partida -----------------------------------------------------------

  /** Sorteio: N pares distintos dos 12 animais, 2N cartas embaralhadas.
   *  Repete o embaralhamento até a disposição diferir da anterior (padrão
   *  "bandeja sempre diferente" do quebra-cabeça dos animais). */
  private newGame(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    cancelSpeech();
    this.first = null;
    this.locked = false;
    this.matchedPairs = 0;
    this.againBtn.classList.remove('visible');

    const pairs = GRID_CELLS[this.size] / 2;
    for (let attempt = 0; attempt < 20; attempt++) {
      const chosen = shuffle(ANIMALS).slice(0, pairs);
      const deck = shuffle([...chosen, ...chosen]);
      const layout = deck.map((i) => ANIMALS.indexOf(i));
      if (this.lastLayout && sameLayout(this.lastLayout, layout)) continue;
      this.lastLayout = layout;
      this.buildBoard(deck);
      break;
    }
    this.fit();
  }

  private buildBoard(deck: PuzzleItem[]): void {
    this.board.innerHTML = '';
    this.cards = [];
    for (const item of deck) {
      const card = document.createElement('button');
      card.className = 'mem-card';
      card.setAttribute('aria-label', 'Carta virada para baixo');

      const inner = document.createElement('div');
      inner.className = 'mem-inner';

      const backFace = document.createElement('div');
      backFace.className = 'mem-face mem-back';
      backFace.textContent = '🐾';
      backFace.setAttribute('aria-hidden', 'true');

      const front = document.createElement('div');
      front.className = 'mem-face mem-front';
      front.setAttribute('aria-hidden', 'true');
      const emoji = document.createElement('div');
      emoji.className = 'mem-emoji';
      emoji.textContent = item.emoji;
      const name = document.createElement('div');
      name.className = 'mem-name';
      name.textContent = item.name;
      front.append(emoji, name);

      inner.append(backFace, front);
      card.append(inner);

      const c: MemCard = { item, el: card, up: false, matched: false };
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.tap(c);
      });
      this.cards.push(c);
      this.board.append(card);
    }
  }

  /** Toque numa carta: só cartas por abrir e jogo sem pausa do par errado. */
  private tap(c: MemCard): void {
    if (this.locked || c.up || c.matched) return; // tocar carta aberta não repete a fala
    c.up = true;
    c.el.classList.add('up');
    c.el.setAttribute('aria-label', c.item.name);
    this.reveal(c);
    if (!this.first) {
      this.first = c;
      return;
    }
    const a = this.first;
    this.first = null;
    if (a.item.name === c.item.name) {
      a.matched = c.matched = true;
      a.el.classList.add('matched');
      c.el.classList.add('matched');
      ding();
      this.matchedPairs++;
      if (this.matchedPairs * 2 === this.cards.length) this.celebrate();
    } else {
      // Nenhum som de "erro": um clique suave e as cartas fecham devagar.
      clique();
      this.locked = true;
      this.after(MISMATCH_MS, () => {
        for (const x of [a, c]) {
          if (x.matched) continue;
          x.up = false;
          x.el.classList.remove('up');
          x.el.setAttribute('aria-label', 'Carta virada para baixo');
        }
        this.locked = false;
      });
    }
  }

  /** Nome falado; quando há gravação, o som do bicho toca a seguir à fala. */
  private reveal(c: MemCard): void {
    const a = c.item;
    const playFile = (): void => {
      if (a.file) playSound(a.file, () => { a.sound?.(); });
    };
    speakName(a.spoken ?? a.name, () => playFile());
  }

  private celebrate(): void {
    win();
    speakName('Encontraste todos os pares!');
    this.againBtn.classList.add('visible');
    this.scheduleFit();
  }

  // ---- layout ------------------------------------------------------------

  /** Fatora as células do tamanho escolhido na orientação que melhor enche o
   *  ecrã (paisagem → mais colunas; retrato → mais linhas) e entrega tudo ao
   *  CSS como variáveis. Sem scroll, em qualquer orientation. */
  private fit(): void {
    const r = this.stage.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    const chrome = this.againBtn.offsetHeight + 10; // pill reservada
    const availW = r.width;
    const availH = r.height - chrome;
    const cells = GRID_CELLS[this.size];
    const gap = 8;
    // Todas as fatorações válidas nas duas orientações (3x4 e 4x3 são ambos
    // candidatos; o score — a maior célula quadrada — escolhe a que enche o
    // ecrã em que estamos). Formas demasiado alongadas ficam de fora.
    let best: { cols: number; cell: number } | null = null;
    for (let cols = 2; cols <= cells; cols++) {
      if (cells % cols !== 0) continue;
      const rows = cells / cols;
      if (cols / rows > 2 || rows / cols > 2) continue;
      const w = (availW - (cols - 1) * gap) / cols;
      const h = (availH - (rows - 1) * gap) / rows;
      const cell = Math.floor(Math.min(w, h));
      if (cell < 20) continue;
      if (!best || cell > best.cell) best = { cols, cell };
    }
    if (!best) best = { cols: Math.max(2, Math.min(4, Math.round(Math.sqrt(cells)))), cell: 40 };
    const s = this.root.style;
    s.setProperty('--cols', String(best.cols));
    s.setProperty('--cell', `${best.cell}px`);
    s.setProperty('--gap', `${gap}px`);
  }

  private scheduleFit(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.fit(); });
  }
  private raf = 0;

  private observeViewport(): void {
    this.fit();
    const on = (): void => this.scheduleFit();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(on);
      this.ro.observe(this.stage);
    }
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    // Fonts e a barra de URL do iOS assentam depois do primeiro paint.
    this.after(350, () => this.scheduleFit());
  }

  private stopObserving(): void {
    this.ro?.disconnect();
    this.ro = null;
  }

  private markSeg(): void {
    for (const [size, b] of this.segBtns) {
      b.classList.toggle('is-on', size === this.size);
      b.setAttribute('aria-pressed', String(size === this.size));
    }
  }

  private after(ms: number, fn: () => void): void {
    const t = window.setTimeout(fn, ms);
    this.timeouts.push(t);
  }
}

function sameLayout(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function readGrid(): GridSize {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === '2x3' || v === '3x4' || v === '4x5') return v;
  } catch { /* modo privado: vive sem memória */ }
  return '3x4';
}

function writeGrid(size: GridSize): void {
  try { localStorage.setItem(LS_KEY, size); } catch { /* idem */ }
}
