import { BOARD_SIZE } from "./types.js";

export class Board {
    cells: boolean[]; // true = зайнята клітинка

    constructor() {
        this.cells = Array(BOARD_SIZE * BOARD_SIZE).fill(false);
    }

    reset() {
        this.cells.fill(false);
    }

    index(x: number, y: number) {
        return y * BOARD_SIZE + x;
    }

    inBounds(x: number, y: number) {
        return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    }

    canPlace(shape: { x: number; y: number }[], ox: number, oy: number) {
        for (const p of shape) {
            const x = ox + p.x, y = oy + p.y;
            if (!this.inBounds(x, y)) return false;
            if (this.cells[this.index(x, y)]) return false;
        }
        return true;
    }

    place(shape: { x: number; y: number }[], ox: number, oy: number) {
        for (const p of shape) {
            const x = ox + p.x, y = oy + p.y;
            this.cells[this.index(x, y)] = true;
        }
    }

    getFullLines(): { rows: number[]; cols: number[]; indexes: number[] } {
        const rows: number[] = [];
        const cols: number[] = [];

        for (let y = 0; y < BOARD_SIZE; y++) {
            let full = true;
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (!this.cells[this.index(x, y)]) { full = false; break; }
            }
            if (full) rows.push(y);
        }

        for (let x = 0; x < BOARD_SIZE; x++) {
            let full = true;
            for (let y = 0; y < BOARD_SIZE; y++) {
                if (!this.cells[this.index(x, y)]) { full = false; break; }
            }
            if (full) cols.push(x);
        }

        const set = new Set<number>();
        for (const y of rows) for (let x = 0; x < BOARD_SIZE; x++) set.add(this.index(x, y));
        for (const x of cols) for (let y = 0; y < BOARD_SIZE; y++) set.add(this.index(x, y));

        return { rows, cols, indexes: Array.from(set) };
    }

    /** Фактично очищаємо передані клітинки */
    clearByIndexes(indexes: number[]) {
        for (const idx of indexes) this.cells[idx] = false;
    }


    hasAnyMove(shapes: { x: number; y: number }[][]) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (const s of shapes) {
                    if (this.canPlace(s, x, y)) return true;
                }
            }
        }
        return false;
    }
}
