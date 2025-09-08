import { BOARD_SIZE } from "./types.js";
export class Board {
    constructor() {
        this.cells = Array(BOARD_SIZE * BOARD_SIZE).fill(false);
    }
    reset() {
        this.cells.fill(false);
    }
    index(x, y) {
        return y * BOARD_SIZE + x;
    }
    inBounds(x, y) {
        return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    }
    canPlace(shape, ox, oy) {
        for (const p of shape) {
            const x = ox + p.x, y = oy + p.y;
            if (!this.inBounds(x, y))
                return false;
            if (this.cells[this.index(x, y)])
                return false;
        }
        return true;
    }
    place(shape, ox, oy) {
        for (const p of shape) {
            const x = ox + p.x, y = oy + p.y;
            this.cells[this.index(x, y)] = true;
        }
    }
    getFullLines() {
        const rows = [];
        const cols = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            let full = true;
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (!this.cells[this.index(x, y)]) {
                    full = false;
                    break;
                }
            }
            if (full)
                rows.push(y);
        }
        for (let x = 0; x < BOARD_SIZE; x++) {
            let full = true;
            for (let y = 0; y < BOARD_SIZE; y++) {
                if (!this.cells[this.index(x, y)]) {
                    full = false;
                    break;
                }
            }
            if (full)
                cols.push(x);
        }
        const set = new Set();
        for (const y of rows)
            for (let x = 0; x < BOARD_SIZE; x++)
                set.add(this.index(x, y));
        for (const x of cols)
            for (let y = 0; y < BOARD_SIZE; y++)
                set.add(this.index(x, y));
        return { rows, cols, indexes: Array.from(set) };
    }
    /** Фактично очищаємо передані клітинки */
    clearByIndexes(indexes) {
        for (const idx of indexes)
            this.cells[idx] = false;
    }
    hasAnyMove(shapes) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (const s of shapes) {
                    if (this.canPlace(s, x, y))
                        return true;
                }
            }
        }
        return false;
    }
}
