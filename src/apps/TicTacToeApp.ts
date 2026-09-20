import './games.css';
import { cancelSpeech, speakName } from '../ui/speech';
import { clique, win, thump } from '../ui/sfx';

// Jogo do Galo 3x3 com X e O. O seletor no topo é a escolha do adulto:
// "2 Jogadores" no mesmo ecrã, ou três calibrações da CPU —
//   Fácil  : célula vazia aleatória (a criança ganha quase sempre);
//   Média  : bloqueia a vitória iminente quando existe uma e uma única
//            célula de bloqueio; senão joga aleatoriamente;
//   Difícil: minimax puro — imbatível.
// No modo CPU a criança é sempre X e abre sempre a partida. Vitória e empate
// são celebrativos: linha destacada, jingle e fala, sem nenhuma mensagem de
// perdedor.

export interface TicTacToeOptions {
  onBack: () => void;
}

type Mode = 'pvp' | 'easy' | 'medium' | 'hard';

const MODE_LABELS: [Mode, string][] = [
  ['pvp', '👫 2'],
  ['easy', '🧸 Fácil'],
  ['medium', '😯 Média'],
  ['hard', '🤖 Difícil']
];
const LS_KEY = 'sofia.ttt.mode';

// As 8 linhas vencedoras do 3x3.
const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
  [0, 4, 8], [2, 4, 6]             // diagonais
];

type Cell = 'x' | 'o' | null;

function empties(b: Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 9; i++) if (!b[i]) out.push(i);
  return out;
}

function winnerOf(b: Cell[]): { mark: 'x' | 'o'; line: [number, number, number] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a] as 'x' | 'o', line };
  }
  return null;
}

/** Linhas em que o jogador `mark` ameaça ganhar e com quantas células vazias. */
function threats(b: Cell[], mark: 'x' | 'o'): number[] {
  const out: number[] = [];
  for (const line of LINES) {
    const vals = line.map((i) => b[i]);
    const mine = vals.filter((v) => v === mark).length;
    const empty = vals.filter((v) => v === null).length;
    if (mine === 2 && empty === 1) out.push(line[vals.indexOf(null)]);
  }
  return out;
}

/** Minimax com alfa-beta. O valor terminal desconta o ply (vitória 10-ply,
 *  derrota ply-10): com ≤ 9 plys o desconto nunca ultrapassa o ±10, portanto
 *  qualquer vitória bate qualquer empate e qualquer empate bate qualquer
 *  derrota — e dentro disso prefere vitórias rápidas e atrasa as do outro. */
function minimax(b: Cell[], turn: 'x' | 'o', me: 'x' | 'o', ply: number, alpha: number, beta: number): number {
  const w = winnerOf(b);
  if (w) return w.mark === me ? 10 - ply : ply - 10;
  const free = empties(b);
  if (!free.length) return 0;
  if (turn === me) {
    let best = -Infinity;
    for (const i of free) {
      b[i] = turn;
      best = Math.max(best, minimax(b, 'o', me, ply + 1, alpha, beta));
      b[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const i of free) {
    b[i] = turn;
    best = Math.min(best, minimax(b, 'x', me, ply + 1, alpha, beta));
    b[i] = null;
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function randomEmpty(b: Cell[]): number {
  const free = empties(b);
  return free[Math.floor(Math.random() * free.length)];
}

export class TicTacToeApp {
  private root: HTMLDivElement;
  private board: HTMLDivElement;
  private cells: HTMLButtonElement[] = [];
  private chipX: HTMLDivElement;
  private chipO: HTMLDivElement;
  private againBtn: HTMLButtonElement;
  private segBtns = new Map<Mode, HTMLButtonElement>();

  private mode: Mode;
  private board0: Cell[] = Array(9).fill(null);
  private turn: 'x' | 'o' = 'x';
  private locked = false; // vitória/empate/a aguardar a CPU: recusa toques
  private gen = 0; // invalida a jogada da CPU após reset/destroy (padrão navSeq)
  private pvpOpensX = true; // primeiro jogador alterna entre partidas em 2p
  private timeouts: number[] = [];

  constructor(private opts: TicTacToeOptions) {
    this.mode = readMode();

    this.root = document.createElement('div');
    this.root.className = 'game game-galo';

    const head = document.createElement('div');
    head.className = 'game-head';

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.setAttribute('aria-label', 'Voltar');
    back.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      cancelSpeech(); // a celebração em curso não passa por cima do launcher
      this.opts.onBack();
    });

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.textContent = 'Jogo do Galo';

    const spacer = document.createElement('div');
    spacer.className = 'game-head-space';
    head.append(back, title, spacer);

    const seg = document.createElement('div');
    seg.className = 'game-seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Modo de jogo');
    for (const [mode, label] of MODE_LABELS) {
      const b = document.createElement('button');
      b.className = 'game-seg-btn';
      b.textContent = label;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (mode === this.mode) return;
        this.mode = mode;
        writeMode(mode);
        this.markSeg();
        this.newGame();
      });
      this.segBtns.set(mode, b);
      seg.append(b);
    }

    // Indicador de turno sem texto: a peça do turno pulsa.
    const turn = document.createElement('div');
    turn.className = 'ttt-turn';
    this.chipX = document.createElement('div');
    this.chipX.className = 'ttt-chip x';
    this.chipX.textContent = 'X';
    this.chipO = document.createElement('div');
    this.chipO.className = 'ttt-chip o';
    this.chipO.textContent = 'O';
    turn.append(this.chipX, this.chipO);

    this.board = document.createElement('div');
    this.board.className = 'ttt-board';
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('button');
      c.className = 'ttt-cell';
      c.setAttribute('aria-label', `Casa ${i + 1} vazia`);
      c.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.tap(i);
      });
      this.cells.push(c);
      this.board.append(c);
    }

    this.againBtn = document.createElement('button');
    this.againBtn.className = 'game-again';
    this.againBtn.textContent = 'Jogar de novo';
    this.againBtn.setAttribute('aria-label', 'Jogar de novo');
    this.againBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.mode === 'pvp') this.pvpOpensX = !this.pvpOpensX;
      this.newGame();
    });

    const stage = document.createElement('div');
    stage.className = 'game-stage';
    stage.append(turn, this.board, this.againBtn);
    this.root.append(head, seg, stage);
    this.markSeg();
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    this.newGame();
  }

  destroy(): void {
    this.gen++; // nenhuma jogada agendada sobrevive
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.root.remove();
  }

  // ---- partida -----------------------------------------------------------

  private newGame(): void {
    this.gen++;
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    cancelSpeech();
    this.board0 = Array(9).fill(null);
    this.locked = false;
    this.againBtn.classList.remove('visible');
    // CPU: a criança é X e abre. 2 Jogadores: X alterna entre partidas.
    this.turn = this.mode === 'pvp' && !this.pvpOpensX ? 'o' : 'x';
    this.cells.forEach((c, i) => {
      c.textContent = '';
      c.className = 'ttt-cell';
      c.setAttribute('aria-label', `Casa ${i + 1} vazia`);
    });
    this.markTurn();
  }

  private tap(i: number): void {
    // Célula ocupada: nada acontece — a marca não muda e o turno não avança.
    if (this.locked || this.board0[i] || this.isCpuTurn()) return;
    this.place(i, this.turn);
    const done = this.checkEnd();
    if (done) return;
    this.turn = this.turn === 'x' ? 'o' : 'x';
    this.markTurn();
    if (this.isCpuTurn()) this.scheduleCpu();
  }

  private place(i: number, mark: 'x' | 'o'): void {
    this.board0[i] = mark;
    const c = this.cells[i];
    c.textContent = mark === 'x' ? 'X' : 'O';
    c.classList.add(mark);
    c.setAttribute('aria-label', `Casa ${i + 1}: ${mark === 'x' ? 'X' : 'O'}`);
    clique();
  }

  private isCpuTurn(): boolean {
    return this.mode !== 'pvp' && this.turn === 'o';
  }

  /** A CPU pensa ~0,6-0,9 s para a jogada ser legível; o número de geração
   *  (padrão navSeq do main.ts) mata a jogada se entretanto se reiniciou. */
  private scheduleCpu(): void {
    this.locked = true;
    const gen = this.gen;
    this.after(600 + Math.random() * 300, () => {
      if (gen !== this.gen) return;
      if (!this.isCpuTurn()) { this.locked = false; return; }
      const i = this.cpuMove();
      this.place(i, 'o');
      if (this.checkEnd()) return;
      this.turn = 'x';
      this.locked = false;
      this.markTurn();
    });
  }

  private cpuMove(): number {
    const b = this.board0;
    if (this.mode === 'easy') return randomEmpty(b);
    if (this.mode === 'medium') {
      const t = threats(b, 'x');
      if (t.length === 1) return t[0];
      const own = threats(b, 'o');
      if (own.length === 1) return own[0];
      return randomEmpty(b);
    }
    // Difícil: minimax puro. A CPU abre com o tabuleiro quase cheio de X,
    // nunca com 9 casas livres, e 3x3 esgota-se em milissegundos.
    let bestScore = -Infinity;
    let best: number[] = [];
    for (const i of empties(b)) {
      b[i] = 'o';
      const score = minimax(b, 'x', 'o', 1, -Infinity, Infinity);
      b[i] = null;
      if (score > bestScore) { bestScore = score; best = [i]; }
      else if (score === bestScore) best.push(i);
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  private checkEnd(): boolean {
    const w = winnerOf(this.board0);
    if (w) {
      this.locked = true;
      // Acabou: nenhuma peça pulsa (o destaque é agora a linha vencedora).
      this.chipX.classList.remove('ttt-on');
      this.chipO.classList.remove('ttt-on');
      for (const i of w.line) this.cells[i].classList.add('ttt-win');
      win();
      if (w.mark === 'x') {
        speakName(this.mode === 'pvp' ? 'Ganharam com X!' : 'Ganhaste!');
      } else {
        // Vitória da CPU: neutro-positivo, sem "perdeste" nenhum.
        speakName(this.mode === 'pvp' ? 'Ganharam com O!' : 'A CPU fez três!');
      }
      this.againBtn.classList.add('visible');
      return true;
    }
    if (!empties(this.board0).length) {
      this.locked = true;
      this.chipX.classList.remove('ttt-on');
      this.chipO.classList.remove('ttt-on');
      thump();
      speakName('Empate!');
      this.againBtn.classList.add('visible');
      return true;
    }
    return false;
  }

  private markTurn(): void {
    this.chipX.classList.toggle('ttt-on', this.turn === 'x' && !this.locked);
    this.chipO.classList.toggle('ttt-on', this.turn === 'o' && !this.locked);
    const cpu = this.mode !== 'pvp';
    this.chipX.setAttribute('aria-label', cpu ? 'A tua vez: X' : 'Vez do X');
    this.chipO.setAttribute('aria-label', cpu ? 'Vez da CPU: O' : 'Vez do O');
  }

  private markSeg(): void {
    for (const [mode, b] of this.segBtns) {
      b.classList.toggle('is-on', mode === this.mode);
      b.setAttribute('aria-pressed', String(mode === this.mode));
    }
  }

  private after(ms: number, fn: () => void): void {
    const t = window.setTimeout(fn, ms);
    this.timeouts.push(t);
  }
}

function readMode(): Mode {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'pvp' || v === 'easy' || v === 'medium' || v === 'hard') return v;
  } catch { /* modo privado: vive sem memória */ }
  return 'easy';
}

function writeMode(mode: Mode): void {
  try { localStorage.setItem(LS_KEY, mode); } catch { /* idem */ }
}
