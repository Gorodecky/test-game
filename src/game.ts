import { Board } from "./board.js";
import { randomPiece } from "./pieces.js";
import { Vec } from "./types.js";

type ResetOpts = { densityMin?: number; densityMax?: number };


export class Game {
  board = new Board();
  score = 0;
  pieces: Vec[][] = [];
  selectedIndex: number | null = null;

  constructor() {
    this.refillPieces();
  }

reset(opts?: ResetOpts) {
  const min = opts?.densityMin ?? 0;
  const max = opts?.densityMax ?? 0;

  this.board.reset();
  this.score = 0;
  this.selectedIndex = null;

  if (max > 0) {
    const density = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
    this.board.preFillRandom(density, true);
  }

  this.refillPieces();

  // гарантуємо хоча б один можливий хід
  let tries = 0;
  while (!this.board.hasAnyMove(this.pieces) && tries < 25) {
    this.board.reset();
    if (max > 0) {
      const d = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
      this.board.preFillRandom(d, true);
    }
    this.refillPieces();
    tries++;
  }
}

  refillPieces() {
    this.pieces = [randomPiece(), randomPiece(), randomPiece()];
    this.selectedIndex = null;
  }

  selectPiece(i: number) {
    if (!this.pieces[i]) return;
    this.selectedIndex = i;
  }

  tryPlace(x: number, y: number): { placed: boolean; cleared: number; clearIndexes: number[] } {
    if (this.selectedIndex == null) return { placed: false, cleared: 0, clearIndexes: [] };
    const shape = this.pieces[this.selectedIndex];
    if (!this.board.canPlace(shape, x, y)) return { placed: false, cleared: 0, clearIndexes: [] };

    // ставимо фігуру
    this.board.place(shape, x, y);

    // знаходимо матчі, не очищаючи
    const { rows, cols, indexes } = this.board.getFullLines();
    const lines = rows.length + cols.length;

    // очки вже рахуємо зараз (бонус за лінії)
    this.score += shape.length + (lines > 0 ? lines * 10 : 0);

    // прибираємо використану фігуру та при потребі добираємо нові
    this.pieces.splice(this.selectedIndex, 1);
    if (this.pieces.length === 0) this.refillPieces();
    this.selectedIndex = null;

    return { placed: true, cleared: lines, clearIndexes: indexes };
  }

  commitClear(indexes: number[]): { gameOver: boolean } {
    if (indexes.length) this.board.clearByIndexes(indexes);
    const hasMove = this.board.hasAnyMove(this.pieces);
    return { gameOver: !hasMove };
  }
}
