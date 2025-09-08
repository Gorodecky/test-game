import { Game } from "./game.js";
import { BOARD_SIZE } from "./types.js";
const boardEl = document.getElementById("board");
const piecesEl = document.getElementById("pieces");
const scoreEl = document.getElementById("score");
const resetBtn = document.getElementById("resetBtn");
const overlayEl = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const newGameBtn = document.getElementById("newGameBtn");
const game = new Game();
let isAnimatingClear = false;
const CLEAR_ANIM_MS = 240;
/** ------- РЕНДЕР ПОЛЯ ------- */
function renderBoard() {
    boardEl.innerHTML = "";
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            const idx = y * BOARD_SIZE + x;
            if (game.board.cells[idx])
                cell.classList.add("filled");
            // зберігаємо координати клітинки для drag-over
            cell._gx = x;
            cell._gy = y;
            cell.addEventListener("mouseenter", () => {
                if (dragState.active) {
                    dragState.hoverX = x;
                    dragState.hoverY = y;
                    cell.classList.add("drop-hover");
                    validateDrag();
                }
                else {
                    cell.classList.add("hover");
                }
            });
            cell.addEventListener("mouseleave", () => {
                cell.classList.remove("hover", "drop-hover");
            });
            // клік як запасний спосіб постановки
            cell.addEventListener("click", () => handlePlace(x, y));
            boardEl.appendChild(cell);
        }
    }
}
/** ------- РЕНДЕР ФІГУР ------- */
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
                if (!filled)
                    el.style.visibility = "hidden";
                piece.appendChild(el);
            }
        }
        // старт drag
        piece.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            startDrag(i, ev.clientX, ev.clientY);
        });
        // клік — старий спосіб: вибір фігури без drag
        piece.addEventListener("click", () => {
            game.selectPiece(i);
            renderPieces();
        });
        piecesEl.appendChild(piece);
    });
}
/** ------- HUD ------- */
function updateHUD() {
    scoreEl.textContent = String(game.score);
}
function showComboPopForClear(lines, clearIndexes) {
    if (lines < 2 || clearIndexes.length === 0)
        return;
    const bonus = lines * 10; // 2 лінії → +20, 3 → +30, ...
    const mid = clearIndexes[Math.floor(clearIndexes.length / 2)];
    const cell = boardEl.children.item(mid);
    if (!cell)
        return;
    const br = boardEl.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "combo-pop" + (bonus >= 30 ? " big" : "");
    el.textContent = `+${bonus}`;
    // координати В МЕЖАХ board (бо .board позиційна)
    el.style.left = `${cr.left - br.left + cr.width / 2}px`;
    el.style.top = `${cr.top - br.top + cr.height / 2}px`;
    boardEl.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}
/** ------- ЛОГІКА ХОДУ ПО КЛІКУ ------- */
function handlePlace(x, y) {
    if (isAnimatingClear)
        return;
    const res = game.tryPlace(x, y);
    if (!res.placed) {
        const idx = y * BOARD_SIZE + x;
        const cell = boardEl.children.item(idx);
        if (cell) {
            cell.classList.add("shake");
            setTimeout(() => cell.classList.remove("shake"), 160);
        }
        return;
    }
    // 1) Відмалюємо поле з новою фігурою
    renderBoard();
    // 2) Якщо є що чистити — анімація, потім commitClear(...)
    if (res.clearIndexes.length > 0) {
        isAnimatingClear = true;
        // 👇 ДОДАНО: показати попап одразу після renderBoard()
        showComboPopForClear(res.cleared, res.clearIndexes);
        for (const idx of res.clearIndexes) {
            const el = boardEl.children.item(idx);
            if (el)
                el.classList.add("clearing");
        }
        setTimeout(() => {
            const { gameOver } = game.commitClear(res.clearIndexes);
            renderBoard();
            renderPieces();
            updateHUD();
            isAnimatingClear = false;
            if (gameOver)
                showGameOver();
        }, CLEAR_ANIM_MS + 20);
    }
    else {
        // коли ліній нема — все одно перевіряємо Game Over
        renderPieces();
        updateHUD();
        const { gameOver } = game.commitClear([]);
        if (gameOver)
            showGameOver();
    }
}
const dragState = {
    active: false,
    pieceIndex: null,
    previewEl: null,
    hoverX: -1,
    hoverY: -1,
    valid: false,
};
function startDrag(pieceIndex, clientX, clientY) {
    if (!game.pieces[pieceIndex])
        return;
    // вибираємо фігуру в моделі (для логіки tryPlace)
    game.selectPiece(pieceIndex);
    dragState.active = true;
    dragState.pieceIndex = pieceIndex;
    // створюємо прев’ю
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
            if (!filled)
                el.style.visibility = "hidden";
            preview.appendChild(el);
        }
    }
    document.body.appendChild(preview);
    dragState.previewEl = preview;
    // одразу перемістимо до курсора
    movePreview(clientX, clientY);
    // глобальні слухачі
    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", onMouseUpDrag);
}
function onMouseMoveDrag(e) {
    if (!dragState.active)
        return;
    // прев’ю біля курсора (через left/top)
    movePreview(e.clientX, e.clientY);
    // елемент під курсором (прев’ю має pointer-events:none у CSS)
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target.classList.contains("cell")) {
        const x = target._gx;
        const y = target._gy;
        dragState.hoverX = x;
        dragState.hoverY = y;
        // перевірка валідності + «примірка» (ghost малюється лише коли можна поставити)
        validateDrag();
        // рамка-якорь тільки коли дійсно можна поставити
        boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));
        if (dragState.valid)
            target.classList.add("drop-hover");
    }
    else {
        // поза клітинками дошки
        dragState.hoverX = -1;
        dragState.hoverY = -1;
        dragState.valid = false;
        boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));
        clearGhost();
        setPreviewValidity(false, /*soft*/ true);
    }
}
function onMouseUpDrag() {
    if (!dragState.active)
        return;
    // якщо валідно й ми над дошкою — ставимо
    if (dragState.valid && dragState.hoverX >= 0 && dragState.hoverY >= 0 && dragState.pieceIndex != null) {
        handlePlace(dragState.hoverX, dragState.hoverY);
    }
    cleanupDrag();
}
function cleanupDrag() {
    dragState.active = false;
    dragState.pieceIndex = null;
    dragState.hoverX = dragState.hoverY = -1;
    dragState.valid = false;
    if (dragState.previewEl?.parentNode)
        dragState.previewEl.parentNode.removeChild(dragState.previewEl);
    dragState.previewEl = null;
    boardEl.querySelectorAll(".cell.drop-hover").forEach(c => c.classList.remove("drop-hover"));
    window.removeEventListener("mousemove", onMouseMoveDrag);
    window.removeEventListener("mouseup", onMouseUpDrag);
}
function movePreview(clientX, clientY) {
    if (!dragState.previewEl)
        return;
    dragState.previewEl.style.left = clientX - 22 + "px";
    dragState.previewEl.style.top = clientY - 22 + "px";
}
function validateDrag() {
    clearGhost();
    const i = dragState.pieceIndex;
    if (i == null || dragState.hoverX < 0 || dragState.hoverY < 0) {
        dragState.valid = false;
        setPreviewValidity(false, /*soft*/ true);
        return;
    }
    // Намалюємо «примірку» (намалює тільки якщо valid)
    paintGhostAt(dragState.hoverX, dragState.hoverY);
    // Стан прев’ю (не червоний, просто притлумлюємо коли не можна)
    setPreviewValidity(dragState.valid);
}
function setPreviewValidity(ok, soft = false) {
    if (!dragState.previewEl)
        return;
    dragState.previewEl.classList.toggle("invalid", !ok);
    if (!ok && !soft) {
        dragState.previewEl.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 120 });
    }
}
function clearGhost() {
    boardEl.querySelectorAll(".cell.ghost-ok")
        .forEach(el => el.classList.remove("ghost-ok"));
}
/** Малює «примірку» фігури тільки якщо можна поставити */
function paintGhostAt(x, y) {
    clearGhost();
    if (dragState.pieceIndex == null)
        return;
    const shape = game.pieces[dragState.pieceIndex];
    const ok = game.board.canPlace(shape, x, y);
    dragState.valid = ok;
    if (!ok)
        return; // НЕ малюємо нічого, коли не можна
    for (const p of shape) {
        const tx = x + p.x, ty = y + p.y;
        if (tx < 0 || ty < 0 || tx >= BOARD_SIZE || ty >= BOARD_SIZE)
            continue;
        const idx = ty * BOARD_SIZE + tx;
        if (game.board.cells[idx])
            continue;
        const el = boardEl.children.item(idx);
        if (el)
            el.classList.add("ghost-ok");
    }
}
/** =================== КІНЕЦЬ DRAG & DROP =================== */
resetBtn.addEventListener("click", () => {
    game.reset();
    renderBoard();
    renderPieces();
    updateHUD();
});
function showGameOver() {
    finalScoreEl.textContent = String(game.score);
    overlayEl.classList.remove("hidden");
    overlayEl.setAttribute("aria-hidden", "false");
}
function hideGameOver() {
    overlayEl.classList.add("hidden");
    overlayEl.setAttribute("aria-hidden", "true");
}
newGameBtn.addEventListener("click", () => {
    game.reset();
    renderBoard();
    renderPieces();
    updateHUD();
    hideGameOver();
});
// старт
renderBoard();
renderPieces();
updateHUD();
