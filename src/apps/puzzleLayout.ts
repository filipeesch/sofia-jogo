// Layout solver for the drag-and-drop puzzles (animals, vehicles, fruits,
// numbers, letters).
//
// Why this exists: the board and the tray used to have fixed sizes and a
// max-width: 520px cap. On a tablet that wasted most of the screen, and on a
// phone (26 letters!) the tray ran past the bottom edge and the last rows of
// pieces were unreachable — the body has overflow:hidden, so they did not even
// scroll. Every puzzle is one screen, so sizes must come from the space that
// is actually there.
//
// The geometry is closed-form, so instead of guessing we try every plausible
// shape and keep the best:
//
//   board = cols x rows grid of slot squares, rows  = ceil(n / cols)
//   tray  = trayCols x trayRows grid of piece squares, trayCols = ceil(n / trayRows)
//   piece = slot * RATIO                        (pieces are a bit smaller)
//
// For a given (cols, trayRows, gap) the largest slot that keeps BOTH grids
// inside the stage falls out of one line of algebra, and we maximise it.

/** Tray piece size relative to the board slot it belongs to. */
export const RATIO = 0.82;
/** Widest gap the solver will ever budget with (px). */
const GAP_MAX = 14;
/** Smallest cell we accept before declaring "does not fit" (px). */
const MIN_CELL = 26;
/** Last-resort floor: better tiny than hidden (px). */
const MIN_CELL_FALLBACK = 14;
/** Bigger than this is just silly, even on a big iPad (px). */
const MAX_CELL = 150;
/** Search limits — the loop is O(cols x rows), both capped, so it is cheap. */
const MAX_BOARD_COLS = 14;
const MAX_TRAY_ROWS = 12;
/** Slack for sub-pixel rounding (px). */
const SAFETY = 6;

export interface PuzzleFit {
  /** Board columns. */
  cols: number;
  /** Board rows (= ceil(n / cols)). */
  rows: number;
  /** Tray columns. */
  trayCols: number;
  /** Tray rows (= ceil(n / trayCols)). */
  trayRows: number;
  /** Board slot size in px. */
  slot: number;
  /** Tray piece size in px (= round(slot * RATIO)). */
  piece: number;
  /** Gap/padding between cells in px. */
  gap: number;
}

export interface PuzzleBox {
  /** Width available for board and tray (px). */
  w: number;
  /** Height available for board + "play again" + tray (px). */
  h: number;
}

/** Gap actually rendered: proportional to the cell, never above what we budgeted. */
function desiredGap(slot: number): number {
  return Math.round(Math.min(GAP_MAX, Math.max(5, slot * 0.12)) * 10) / 10;
}

/**
 * One pass: the largest fit for every (board cols x tray rows) shape, with a
 * fixed gap budget. minCell lets the caller retry with a smaller floor.
 */
function pass(n: number, box: PuzzleBox, gap: number, minCell: number): PuzzleFit | null {
  const { w, h } = box;
  let best: PuzzleFit | null = null;
  let bestScore = -Infinity;

  for (let cols = 1; cols <= Math.min(n, MAX_BOARD_COLS); cols++) {
    const rows = Math.ceil(n / cols);
    for (let trayRows = 1; trayRows <= Math.min(n, MAX_TRAY_ROWS); trayRows++) {
      const trayCols = Math.ceil(n / trayRows);

      // Vertical budget, matching the CSS exactly (stage gap = gap, tray
      // padding = gap on both sides):
      //   rows*slot + (rows-1)*gap            board
      // + 2 * gap                             stage gaps around "play again"
      // + trayRows*piece + (trayRows+1)*gap   tray (inner gaps + padding)
      const gapUnits = rows - 1 + 2 + trayRows + 1;
      const slotFromH = (h - gapUnits * gap) / (rows + trayRows * RATIO);
      // Horizontal budgets (the tray also pays for its left/right padding).
      const slotFromWB = (w - (cols - 1) * gap) / cols;
      const slotFromWT = (w - (trayCols + 1) * gap) / (trayCols * RATIO);

      const slot = Math.floor(Math.min(slotFromH, slotFromWB, slotFromWT, MAX_CELL));
      if (slot < minCell) continue;

      const piece = Math.round(slot * RATIO);
      // Biggest cells win; among near-ties prefer the shape that actually
      // covers the screen (a tall narrow board on a wide screen loses).
      const boardW = cols * slot + (cols - 1) * gap;
      const boardH = rows * slot + (rows - 1) * gap;
      const fill = (boardW * boardH) / Math.max(1, w * h);
      const score = slot + fill;

      if (score > bestScore) {
        bestScore = score;
        best = { cols, rows, trayCols, trayRows, slot, piece, gap };
      }
    }
  }
  return best;
}

/**
 * Best fit for n items inside box. Returns null when the box is nonsense
 * (zero size — happens while the app is still being mounted).
 */
export function solvePuzzleFit(n: number, box: PuzzleBox): PuzzleFit | null {
  if (n <= 0 || box.w < 40 || box.h < 40) return null;
  const b = { w: box.w, h: box.h - SAFETY };

  let gap = GAP_MAX;
  let fit = pass(n, b, gap, MIN_CELL);
  if (!fit) {
    fit = pass(n, b, gap, MIN_CELL_FALLBACK);
    gap = GAP_MAX;
  }
  if (!fit) return null;

  // The rendered gap is proportional to the cell, so shrink the budget and
  // re-solve until the budget is >= what the CSS will draw. gap only ever
  // decreases, so every fit returned here is guaranteed not to overflow.
  for (let i = 0; i < 3; i++) {
    const want = desiredGap(fit.slot);
    if (want >= gap) break; // drawing it would be wider than budgeted
    gap = want;
    const again = pass(n, b, gap, fit.slot >= MIN_CELL ? MIN_CELL : MIN_CELL_FALLBACK);
    if (!again) break;
    fit = again;
  }
  return { ...fit, gap };
}
