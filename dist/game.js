import { Board } from "./board.js";
import { randomPiece, SHAPES } from "./pieces.js"; // або "./piece.js"
import { BOARD_SIZE } from "./types.js";
/** Чи має форма хоча б одне місце на полі */
function shapeHasAnyPlacement(board, shape) {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board.canPlace(shape, x, y))
                return true;
        }
    }
    return false;
}
/** Створює руку з 3 фігур, де КОЖНА фігура має хоча б одну позицію на полі.
 *  Якщо на полі немає жодної придатної фігури — повертає null (це чесний game over).
 *  Поведінка: якщо кандидатів ≥ 3 — беремо без повторів; якщо < 3 — добираємо з повтореннями.
 */
function makeAllPlayableHand(board) {
    const candidates = SHAPES.filter(s => shapeHasAnyPlacement(board, s));
    if (candidates.length === 0)
        return null;
    // перемішати кандидатів
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const hand = [];
    if (shuffled.length >= 3) {
        hand.push(shuffled[0], shuffled[1], shuffled[2]); // без повторів
    }
    else {
        // кандидатів 1–2: добираємо з повтореннями — УСІ вони все одно ставляться зараз
        while (hand.length < 3) {
            hand.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
        }
    }
    return hand;
}
function randomHand() {
    return [randomPiece(), randomPiece(), randomPiece()];
}
export class Game {
    constructor() {
        this.board = new Board();
        this.score = 0;
        this.pieces = [];
        this.selectedIndex = null;
        this.refillPieces(true);
    }
    /** Почати гру заново; можна задати щільність стартового заповнення поля */
    reset(opts) {
        const min = opts?.densityMin ?? 0;
        const max = opts?.densityMax ?? 0;
        this.board.reset();
        this.score = 0;
        this.selectedIndex = null;
        // Стартовий префілд (за потреби), без миттєвих повних ліній
        if (max > 0) {
            const density = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
            this.board.preFillRandom(density, /*avoidFullLines*/ true);
        }
        // Добираємо руку так, щоб КОЖНА фігура ставилась
        let hand = makeAllPlayableHand(this.board);
        // Якщо поле «патова» (жодна форма не влазить) — спробуємо перегенерувати префілд кілька разів
        let tries = 0;
        while (!hand && tries < 20 && max > 0) {
            this.board.reset();
            const d = Math.min(0.95, Math.max(0, min + Math.random() * (max - min)));
            this.board.preFillRandom(d, true);
            hand = makeAllPlayableHand(this.board);
            tries++;
        }
        this.pieces = hand ?? randomHand(); // якщо й досі null — це реальний game over (рука будь-яка)
        this.selectedIndex = null;
    }
    /** Добрати 3 фігури; allMustFit=true — КОЖНА фігура в руці має ставитись на поточне поле */
    refillPieces(allMustFit = true) {
        if (allMustFit) {
            const hand = makeAllPlayableHand(this.board);
            this.pieces = hand ?? randomHand(); // null буває лише коли поле «мертве»
        }
        else {
            this.pieces = randomHand();
        }
        this.selectedIndex = null;
    }
    selectPiece(i) {
        if (this.pieces[i])
            this.selectedIndex = i;
    }
    /**
     * Спроба поставити вибрану фігуру на (x,y).
     * Повертає: placed / cleared / clearIndexes (для анімації).
     */
    tryPlace(x, y) {
        if (this.selectedIndex == null)
            return { placed: false, cleared: 0, clearIndexes: [] };
        const shape = this.pieces[this.selectedIndex];
        if (!this.board.canPlace(shape, x, y))
            return { placed: false, cleared: 0, clearIndexes: [] };
        // ставимо
        this.board.place(shape, x, y);
        // шукаємо повні лінії (без фактичного очищення — це для анімації)
        const { rows, cols, indexes } = this.board.getFullLines();
        const lines = rows.length + cols.length;
        // очки: розмір фігури + бонус за лінії
        this.score += shape.length + (lines > 0 ? lines * 10 : 0);
        // прибираємо використану фігуру; якщо рука спорожніла — добираємо ТРИ, і кожна має ставитись
        this.pieces.splice(this.selectedIndex, 1);
        if (this.pieces.length === 0)
            this.refillPieces(true);
        this.selectedIndex = null;
        return { placed: true, cleared: lines, clearIndexes: indexes };
    }
    /**
     * Після анімації: реально очистити клітинки й перевірити, чи є ще хід.
     * */
    commitClear(indexes) {
        if (indexes.length)
            this.board.clearByIndexes(indexes);
        const hasMove = this.board.hasAnyMove(this.pieces);
        return { gameOver: !hasMove };
    }
}
