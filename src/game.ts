import { Board } from "./board.js";
import { randomPiece, SHAPES } from "./pieces.js"; // ← або "./piece.js"
import { BOARD_SIZE } from "./types.js";
import type { Vec } from "./types.js";

type ResetOpts = {
  densityMin?: number;
  densityMax?: number;
};

function shapeHasAnyPlacement(board: Board, shape: Vec[]): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board.canPlace(shape, x, y)) return true;
    }
  }
  return false;
}

function pickGuaranteedShape(board: Board): Vec[] | null {
  const candidates = SHAPES.filter(s => shapeHasAnyPlacement(board, s));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomHand(): Vec[][] {
  return [randomPiece(), randomPiece(), randomPiece()];
}

/** Підбирає трійку, яка має хоча б один хід; якщо немає жодної — повертає null */
function playableHandOrNull(board: Board, maxTries = 20): Vec[][] | null {
  for (let i = 0; i < maxTries; i++) {
    const hand = randomHand();
    if (board.hasAnyMove(hand)) return hand;
  }
  const sure = pickGuaranteedShape(board);
  if (!sure) return null;
  return [sure, randomPiece(), randomPiece()];
}

export class Game {
  board = new Board();
  score = 0;
  pieces: Vec[][] = [];
  selectedIndex: number | null = null;

  constructor() {
    this.refillPieces(true);
  }

  /** Почати гру заново; можна задати щільність стартового заповнення поля */
  reset(opts?: ResetOpts) {
    const min = opts?.densityMin ?? 0;
    const max = opts?.densityMax ?? 0;

    this.board.reset();
    this.score = 0;
    this.selectedIndex = null;

    if (max > 0) {
      const density = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
      this.board.preFillRandom(density, /*avoidFullLines*/ true);
    }

    this.refillPieces(true);

    // гарантуємо хоч один можливий хід на старті
    let tries = 0;
    while (!this.board.hasAnyMove(this.pieces) && tries < 25) {
      this.board.reset();
      if (max > 0) {
        const d = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
        this.board.preFillRandom(d, true);
      }
      this.refillPieces(true);
      tries++;
    }
  }

  /** Добрати 3 фігури; ensurePlayable=true — уникаємо «мертвих роздач» */
  refillPieces(ensurePlayable = true) {
    if (!ensurePlayable) {
      this.pieces = randomHand();
      this.selectedIndex = null;
      return;
    }
    const hand = playableHandOrNull(this.board);
    this.pieces = hand ?? randomHand();
    this.selectedIndex = null;
  }

  selectPiece(i: number) { if (this.pieces[i]) this.selectedIndex = i; }

  /**
   * Спроба поставити вибрану фігуру на (x,y).
   * Повертає: placed / cleared / clearIndexes (для анімації).
   */
  tryPlace(x: number, y: number): { placed: boolean; cleared: number; clearIndexes: number[] } {
    if (this.selectedIndex == null) return { placed: false, cleared: 0, clearIndexes: [] };
    const shape = this.pieces[this.selectedIndex];
    if (!this.board.canPlace(shape, x, y)) return { placed: false, cleared: 0, clearIndexes: [] };

    // ставимо
    this.board.place(shape, x, y);

    // шукаємо повні лінії (без фактичного очищення)
    const { rows, cols, indexes } = this.board.getFullLines();
    const lines = rows.length + cols.length;

    // очки: розмір фігури + бонус за лінії
    this.score += shape.length + (lines > 0 ? lines * 10 : 0);

    // прибираємо використану фігуру; при потребі — добираємо трійку
    this.pieces.splice(this.selectedIndex, 1);
    if (this.pieces.length === 0) this.refillPieces(true);
    this.selectedIndex = null;

    return { placed: true, cleared: lines, clearIndexes: indexes };
  }

  /**
   * Після анімації: реально очистити клітинки й перевірити, чи є ще хід.
   * НІЯКИХ замін руки всередині — лише логічна перевірка.
   */
  commitClear(indexes: number[]): { gameOver: boolean } {
    if (indexes.length) this.board.clearByIndexes(indexes);
    const hasMove = this.board.hasAnyMove(this.pieces);
    return { gameOver: !hasMove };
  }
}
