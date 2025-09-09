import { Game } from "./game.js";
import { BOARD_SIZE } from "./types.js";

const boardEl = document.getElementById("board")!;
const piecesEl = document.getElementById("pieces")!;
const scoreEl = document.getElementById("score")!;
const resetBtn = document.getElementById("resetBtn")! as HTMLButtonElement;

// Модалка Game Over
const overlayEl = document.getElementById("gameOverOverlay") as HTMLElement;
const finalScoreEl = document.getElementById("finalScore") as HTMLElement;
const newGameBtn = document.getElementById("newGameBtn") as HTMLButtonElement;

function showGameOver() {
    finalScoreEl.textContent = String(game.score);
    overlayEl.classList.remove("hidden");
    overlayEl.setAttribute("aria-hidden", "false");
}
function hideGameOver() {
    overlayEl.classList.add("hidden");
    overlayEl.setAttribute("aria-hidden", "true");
}

const game = new Game();

/* -------------------- РЕНДЕР ПОЛЯ -------------------- */
function renderBoard() {
    boardEl.innerHTML = "";
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            const idx = y * BOARD_SIZE + x;
            if (game.board.cells[idx]) cell.classList.add("filled");

            // координати клітинки (для DnD через elementFromPoint)
            (cell as any)._gx = x;
            (cell as any)._gy = y;

            // запасний спосіб — клік по клітинці
            cell.addEventListener("click", () => handlePlace(x, y));
            boardEl.appendChild(cell);
        }
    }
}

/* -------------------- РЕНДЕР ФІГУР -------------------- */
function renderPieces() {
    piecesEl.innerHTML = "";
    game.pieces.forEach((shape, i) => {
        const maxX = Math.max(...shape.map(p => p.x));
        const maxY = Math.max(...shape.map(p => p.y));
        const piece = document.createElement("div");
        piece.className = "piece";
        piece.style.gridTemplateColumns = `repeat(${maxX + 1}, 20px)`;
        piece.style.gridTemplateRows = `repeat(${maxY + 1}, 20px)`;

        for (let r = 0; r <= maxY; r++) {
            for (let c = 0; c <= maxX; c++) {
                const filled = shape.some(p => p.x === c && p.y === r);
                const el = document.createElement("div");
                el.className = "pcell";
                if (!filled) el.style.visibility = "hidden";
                piece.appendChild(el);
            }
        }

        // старт drag
        piece.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            startDrag(i, ev.clientX, ev.clientY);
        });

        // клік — вибір без drag (необов'язково)
        piece.addEventListener("click", () => {
            game.selectPiece(i);
            renderPieces();
        });

        piecesEl.appendChild(piece);
    });
}

/* -------------------- HUD -------------------- */
function updateHUD() {
    scoreEl.textContent = String(game.score);
}

/* -------------------- HANDLE PLACE -------------------- */
const CLEAR_ANIM_MS = 240;
let isAnimatingClear = false;

function handlePlace(x: number, y: number): void {
    if (isAnimatingClear) return;

    const res = game.tryPlace(x, y);
    if (!res.placed) {
        const idx = y * BOARD_SIZE + x;
        const cell = boardEl.children.item(idx) as HTMLElement | null;
        if (cell) { cell.classList.add("shake"); setTimeout(() => cell.classList.remove("shake"), 160); }
        return;
    }

    // нова фігура поставлена — прибираємо «примірку»
    clearGhost();

    // 1) перемальовуємо поле з поставленою фігурою
    renderBoard();

    // 2) якщо є, що чистити — анімація, потім commitClear
    if (res.clearIndexes.length > 0) {
        isAnimatingClear = true;

        for (const idx of res.clearIndexes) {
            const el = boardEl.children.item(idx) as HTMLElement | null;
            if (el) el.classList.add("clearing");
        }

        setTimeout(() => {
            const { gameOver } = game.commitClear(res.clearIndexes);
            renderBoard();
            renderPieces();
            updateHUD();
            isAnimatingClear = false;
            if (gameOver) showGameOver();
        }, CLEAR_ANIM_MS + 20);

    } else {
        // без очищень — одразу перевірка на Game Over
        const { gameOver } = game.commitClear([]);
        renderBoard();
        renderPieces();
        updateHUD();
        if (gameOver) showGameOver();
    }
}

/* -------------------- DRAG & DROP -------------------- */
type DragState = {
    active: boolean;
    pieceIndex: number | null;
    previewEl: HTMLElement | null;
    hoverX: number;
    hoverY: number;
    valid: boolean;
};

const dragState: DragState = {
    active: false,
    pieceIndex: null,
    previewEl: null,
    hoverX: -1,
    hoverY: -1,
    valid: false,
};

function startDrag(pieceIndex: number, clientX: number, clientY: number) {
    if (!game.pieces[pieceIndex]) return;

    // вибрати фігуру в моделі (для canPlace/tryPlace)
    game.selectPiece(pieceIndex);

    dragState.active = true;
    dragState.pieceIndex = pieceIndex;

    // створюємо прев’ю-фігуру
    const shape = game.pieces[pieceIndex];
    const maxX = Math.max(...shape.map(p => p.x));
    const maxY = Math.max(...shape.map(p => p.y));

    const preview = document.createElement("div");
    preview.className = "drag-preview";
    preview.style.gridTemplateColumns = `repeat(${maxX + 1}, calc(var(--cell) * 0.9))`;
    preview.style.gridTemplateRows = `repeat(${maxY + 1}, calc(var(--cell) * 0.9))`;

    for (let r = 0; r <= maxY; r++) {
        for (let c = 0; c <= maxX; c++) {
            const filled = shape.some(p => p.x === c && p.y === r);
            const el = document.createElement("div");
            el.className = "pcell";
            if (!filled) el.style.visibility = "hidden";
            preview.appendChild(el);
        }
    }

    document.body.appendChild(preview);
    dragState.previewEl = preview;

    movePreview(clientX, clientY);

    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", onMouseUpDrag);
}

function onMouseMoveDrag(e: MouseEvent) {
    if (!dragState.active) return;

    // прев’ю біля курсора (через left/top, без transform)
    movePreview(e.clientX, e.clientY);

    // елемент під курсором (прев’ю має pointer-events:none у CSS)
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

    if (target && target.classList.contains("cell")) {
        const x = (target as any)._gx as number;
        const y = (target as any)._gy as number;

        dragState.hoverX = x;
        dragState.hoverY = y;

        // перевірка валідності + «примірка» (ghost тільки коли можна поставити)
        validateDrag();

        // рамка-якір лише коли дійсно можна поставити
        boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));
        if (dragState.valid) target.classList.add("drop-hover");
    } else {
        // поза дошкою
        dragState.hoverX = -1;
        dragState.hoverY = -1;
        dragState.valid = false;
        boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));
        clearGhost();
        setPreviewValidity(false, /*soft*/ true);
    }
}

function onMouseUpDrag() {
    if (!dragState.active) return;

    if (dragState.valid && dragState.hoverX >= 0 && dragState.hoverY >= 0 && dragState.pieceIndex != null) {
        handlePlace(dragState.hoverX, dragState.hoverY);
    }
    cleanupDrag();
}

function cleanupDrag() {
    dragState.active = false;
    dragState.pieceIndex = null;
    dragState.hoverX = -1;
    dragState.hoverY = -1;
    dragState.valid = false;

    if (dragState.previewEl?.parentNode) dragState.previewEl.parentNode.removeChild(dragState.previewEl);
    dragState.previewEl = null;

    clearGhost();
    boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));

    window.removeEventListener("mousemove", onMouseMoveDrag);
    window.removeEventListener("mouseup", onMouseUpDrag);
}

function movePreview(clientX: number, clientY: number) {
    if (!dragState.previewEl) return;
    dragState.previewEl.style.left = clientX - 22 + "px";
    dragState.previewEl.style.top = clientY - 22 + "px";
}

function setPreviewValidity(ok: boolean, soft = false) {
    if (!dragState.previewEl) return;
    dragState.previewEl.classList.toggle("invalid", !ok);
    if (!ok && !soft) {
        dragState.previewEl.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
            { duration: 120 }
        );
    }
}

/* --------- ПІДСВІТКА «ПРИМІРКИ» НА ПОЛІ --------- */
function clearGhost() {
    boardEl.querySelectorAll(".cell.ghost-ok").forEach(el => el.classList.remove("ghost-ok"));
}

function paintGhostAt(x: number, y: number) {
    clearGhost();
    if (dragState.pieceIndex == null) return;

    const shape = game.pieces[dragState.pieceIndex];
    const ok = game.board.canPlace(shape, x, y);
    dragState.valid = ok;

    if (!ok) return; // малюємо тільки коли можна поставити

    for (const p of shape) {
        const tx = x + p.x, ty = y + p.y;
        if (tx < 0 || ty < 0 || tx >= BOARD_SIZE || ty >= BOARD_SIZE) continue;
        const idx = ty * BOARD_SIZE + tx;
        if (game.board.cells[idx]) continue;
        const el = boardEl.children.item(idx) as HTMLElement | null;
        if (el) el.classList.add("ghost-ok");
    }
}

function validateDrag() {
    clearGhost();

    if (dragState.pieceIndex == null || dragState.hoverX < 0 || dragState.hoverY < 0) {
        dragState.valid = false;
        setPreviewValidity(false, /*soft*/ true);
        return;
    }
    paintGhostAt(dragState.hoverX, dragState.hoverY); // ставить dragState.valid усередині
    setPreviewValidity(dragState.valid);
}

/* -------------------- КНОПКИ -------------------- */
resetBtn.addEventListener("click", () => {
    game.reset({ densityMin: 0.50, densityMax: 0.60 });
    clearGhost();
    renderBoard();
    renderPieces();
    updateHUD();
});

newGameBtn.addEventListener("click", () => {
    game.reset({ densityMin: 0.50, densityMax: 0.60 });
    clearGhost();
    renderBoard();
    renderPieces();
    updateHUD();
    hideGameOver();
});

/* -------------------- СТАРТ -------------------- */
game.reset({ densityMin: 0.50, densityMax: 0.60 });
renderBoard();
renderPieces();
updateHUD();
