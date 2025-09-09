import { BOARD_SIZE } from "./types.js";

export class Board {
    cells: boolean[]; // true = зайнята клітинка

    constructor() {
        this.cells = Array(BOARD_SIZE * BOARD_SIZE).fill(false);
    }

    reset() {
        this.cells.fill(false);
    }

    preFillRandom(density: number, avoidFullLines = true): number {
        const total = BOARD_SIZE * BOARD_SIZE;
        const target = Math.max(0, Math.min(total, Math.round(total * density)));

        // Список усіх індексів, перемішуємо Фішером–Єйтсом
        const idxs = Array.from({ length: total }, (_, i) => i);
        for (let i = idxs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
        }

        let placed = 0;
        for (const idx of idxs) {
            if (placed >= target) break;
            if (this.cells[idx]) continue;

            const x = idx % BOARD_SIZE;
            const y = Math.floor(idx / BOARD_SIZE);

            this.cells[idx] = true;

            if (avoidFullLines) {
                // Перевіримо чи не утворили повний рядок/стовпець
                let rowFull = true;
                for (let cx = 0; cx < BOARD_SIZE; cx++) {
                    if (!this.cells[this.index(cx, y)]) { rowFull = false; break; }
                }
                let colFull = true;
                for (let cy = 0; cy < BOARD_SIZE; cy++) {
                    if (!this.cells[this.index(x, cy)]) { colFull = false; break; }
                }
                if (rowFull || colFull) {
                    this.cells[idx] = false; // відміняємо хід, щоб не було автоліній
                    continue;
                }
            }

            placed++;
        }
        return placed;
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
