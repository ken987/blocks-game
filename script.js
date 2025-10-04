document.addEventListener('DOMContentLoaded', () => {
    const BOARD_SIZE = 20;
    const PLAYERS = [
        { id: 0, name: 'あなた', color: 'player-0', corner: { r: 0, c: 0 }, type: 'human' },
        { id: 1, name: 'AI 1 (黄)', color: 'player-1', corner: { r: 0, c: BOARD_SIZE - 1 }, type: 'ai' },
        { id: 2, name: 'AI 2 (赤)', color: 'player-2', corner: { r: BOARD_SIZE - 1, c: BOARD_SIZE - 1 }, type: 'ai' },
        { id: 3, name: 'AI 3 (緑)', color: 'player-3', corner: { r: BOARD_SIZE - 1, c: 0 }, type: 'ai' },
    ];
    const AI_THINK_TIME = 500; // ms

    // DOM Elements
    const startGameOverlay = document.getElementById('start-game-overlay');
    const startGameBtn = document.getElementById('start-game-btn');
    const settingsEl = document.getElementById('settings');
    const gameContainer = document.getElementById('game-container');
    const difficultySelect = document.getElementById('difficulty-select');
    const boardEl = document.getElementById('game-board');
    const playerInfoEl = document.getElementById('player-info');
    const messageAreaEl = document.getElementById('message-area');
    const piecePaletteEl = document.getElementById('piece-palette');
    const piecePreviewEl = document.getElementById('piece-preview');
    const controlsEl = document.getElementById('controls');
    const rotateBtn = document.getElementById('rotate-btn');
    const flipBtn = document.getElementById('flip-btn');
    const hintBtn = document.getElementById('hint-btn');
    const passBtn = document.getElementById('pass-btn');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalMessageEl = document.getElementById('final-message');
    const restartBtn = document.getElementById('restart-btn');

    // Game State
    let board, pieces, playerState, currentPlayerIndex, selectedPiece, passCounter, isGameOver, gameDifficulty;

    function main() {
    // alert("test"); ← 削除

    // 代わりに setTimeout を使う
    setTimeout(() => {
        startGameBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', init);
    }, 100); // 100ms 後に実行（必要なら時間は調整）
    }


    function startGame() {
        startGameOverlay.classList.add('hidden');
        settingsEl.classList.remove('hidden');
        gameContainer.classList.remove('hidden');
        init();
    }

    function definePieces() {
        pieces = {
            '1': [[1]], '2': [[1, 1]], '3i': [[1, 1, 1]], '3l': [[1, 1], [0, 1]],
            '4i': [[1, 1, 1, 1]], '4l': [[1, 1, 1], [0, 0, 1]], '4s': [[0, 1, 1], [1, 1, 0]], '4t': [[1, 1, 1], [0, 1, 0]], '4o': [[1, 1], [1, 1]],
            '5f': [[0, 1, 1], [1, 1, 0], [0, 1, 0]], '5i': [[1, 1, 1, 1, 1]], '5l': [[1, 1, 1, 1], [1, 0, 0, 0]], '5n': [[0, 1, 1, 0], [1, 1, 0, 0]], '5p': [[1, 1], [1, 1], [1, 0]], '5t': [[1, 1, 1], [0, 1, 0], [0, 1, 0]], '5u': [[1, 0, 1], [1, 1, 1]], '5v': [[1, 0, 0], [1, 0, 0], [1, 1, 1]], '5w': [[1, 0, 0], [1, 1, 0], [0, 1, 1]], '5x': [[0, 1, 0], [1, 1, 1], [0, 1, 0]], '5y': [[1, 1, 1, 1], [0, 1, 0, 0]], '5z': [[1, 1, 0], [0, 1, 0], [0, 1, 1]]
        };
    }

    function init() {
        definePieces();
        gameDifficulty = difficultySelect.value;
        board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        playerState = PLAYERS.map(p => ({ ...p, pieces: Object.keys(pieces), isFirstMove: true, score: 0 }));
        currentPlayerIndex = 0;
        isGameOver = false;
        passCounter = 0;
        selectedPiece = null;

        gameOverOverlay.classList.add('hidden');
        difficultySelect.disabled = false;
        boardEl.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.r = r; cell.dataset.c = c; boardEl.appendChild(cell); }

        addEventListeners();
        handleTurn();
    }

    function addEventListeners() {
        rotateBtn.onclick = () => { if (selectedPiece) { selectedPiece.shape = rotateMatrix(selectedPiece.shape); renderPreview(); } };
        flipBtn.onclick = () => { if (selectedPiece) { selectedPiece.shape = flipMatrix(selectedPiece.shape); renderPreview(); } };
        passBtn.onclick = passTurn;
        hintBtn.onclick = showHint;
        boardEl.addEventListener('mouseover', handleBoardHover);
        boardEl.addEventListener('mouseout', handleBoardMouseOut);
        boardEl.addEventListener('click', handleBoardClick);
    }

    function handleTurn() {
        if (isGameOver) return;
        const player = playerState[currentPlayerIndex];
        selectedPiece = null;
        renderBoard();
        renderPlayerInfo();
        renderPiecePalette();
        renderPreview();

        if (player.type === 'human') {
            controlsEl.style.display = 'block';
            piecePaletteEl.style.display = 'flex';
            messageAreaEl.textContent = 'ピースを選択するか、ヒントを使ってください。';
        } else {
            controlsEl.style.display = 'none';
            piecePaletteEl.style.display = 'none';
            messageAreaEl.textContent = `${player.name}が考えています...`;
            setTimeout(executeAiTurn, AI_THINK_TIME);
        }
    }

    function placePiece(pieceName, shape, startR, startC) {
        difficultySelect.disabled = true; // Lock difficulty after first move
        const player = playerState[currentPlayerIndex];
        for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) if (shape[r][c]) board[startR + r][startC + c] = player.id;
        player.pieces = player.pieces.filter(p => p !== pieceName);
        player.isFirstMove = false;
        passCounter = 0;
    }

    function nextTurn() { currentPlayerIndex = (currentPlayerIndex + 1) % PLAYERS.length; if (checkEndGame()) return; handleTurn(); }
    function passTurn() { if (isGameOver) return; passCounter++; messageAreaEl.textContent = `${playerState[currentPlayerIndex].name}がパスしました。`; nextTurn(); }
    function checkEndGame() { if (passCounter >= PLAYERS.length) { isGameOver = true; calculateScores(); return true; } return false; }

    function calculateScores() {
        let minScore = Infinity, winners = [];
        playerState.forEach(player => {
            player.score = player.pieces.reduce((sum, pieceName) => sum + pieces[pieceName].flat().reduce((s, v) => s + v, 0), 0);
            if (player.score < minScore) { minScore = player.score; winners = [player.name]; } else if (player.score === minScore) { winners.push(player.name); }
        });
        const scoreText = playerState.map(p => `${p.name}: ${p.score}点`).join(' | ');
        finalMessageEl.innerHTML = `<h2>ゲーム終了！</h2><p>勝者: ${winners.join(', ')}</p><p>${scoreText}</p>`;
        gameOverOverlay.classList.remove('hidden');
    }

    // --- AI Logic ---
    function executeAiTurn() {
        const player = playerState[currentPlayerIndex];
        let move = null;
        if (gameDifficulty === 'easy') move = findEasyMove(player);
        else if (gameDifficulty === 'normal') move = findNormalMove(player);
        else if (gameDifficulty === 'hard') move = findHardMove(player);

        if (move) {
            placePiece(move.pieceName, move.shape, move.r, move.c);
            messageAreaEl.textContent = `${player.name}がピースを配置しました。`;
            setTimeout(nextTurn, 200);
        } else {
            passTurn();
        }
    }

    function getAllPossibleMoves(player) {
        const moves = [];
        const sortedPieces = player.pieces.slice().sort((a, b) => pieces[b].flat().length - pieces[a].flat().length);
        for (const pieceName of sortedPieces) {
            let shape = pieces[pieceName];
            for (let flip = 0; flip < 2; flip++) {
                for (let rot = 0; rot < 4; rot++) {
                    for (let r = 0; r < BOARD_SIZE; r++) {
                        for (let c = 0; c < BOARD_SIZE; c++) {
                            if (isValidPlacement(shape, r, c, player)) {
                                moves.push({ pieceName, shape, r, c, size: pieces[pieceName].flat().length });
                            }
                        }
                    }
                    shape = rotateMatrix(shape);
                }
                shape = flipMatrix(shape);
            }
        }
        return moves;
    }

    function findEasyMove(player) { return getAllPossibleMoves(player)[0] || null; }

    function findNormalMove(player) {
        const moves = getAllPossibleMoves(player);
        if (moves.length === 0) return null;
        const maxSize = moves[0].size;
        const bestSizeMoves = moves.filter(m => m.size === maxSize);

        let bestMove = null, minDistance = Infinity;
        const boardCenter = (BOARD_SIZE - 1) / 2;
        for (const move of bestSizeMoves) {
            const pieceCenterR = move.r + (move.shape.length - 1) / 2;
            const pieceCenterC = move.c + (move.shape[0].length - 1) / 2;
            const distance = Math.sqrt(Math.pow(pieceCenterR - boardCenter, 2) + Math.pow(pieceCenterC - boardCenter, 2));
            if (distance < minDistance) { minDistance = distance; bestMove = move; }
        }
        return bestMove;
    }

    function findHardMove(player) {
        const moves = getAllPossibleMoves(player);
        if (moves.length === 0) return null;

        const humanPlayer = playerState.find(p => p.type === 'human');
        const humanCorners = getPlayerCorners(humanPlayer);

        let bestMove = null, maxScore = -Infinity;
        for (const move of moves) {
            let score = move.size * 10;
            const blockingCount = countBlockedCorners(move, humanCorners);
            score += blockingCount * 5; // Add bonus for blocking
            if (score > maxScore) { maxScore = score; bestMove = move; }
        }
        return bestMove;
    }

    function getPlayerCorners(player) {
        const corners = new Set();
        for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === player.id) {
                [[r-1,c-1],[r-1,c+1],[r+1,c-1],[r+1,c+1]].forEach(([nr,nc]) => {
                    if(isValidPlacement([[1]], nr, nc, player)) corners.add(`${nr},${nc}`);
                });
            }
        }
        return corners;
    }

    function countBlockedCorners(move, humanCorners) {
        let count = 0;
        for (let r = 0; r < move.shape.length; r++) for (let c = 0; c < move.shape[r].length; c++) {
            if (move.shape[r][c]) {
                const key = `${move.r + r},${move.c + c}`;
                if (humanCorners.has(key)) count++;
            }
        }
        return count;
    }

    function showHint() {
        if (playerState[currentPlayerIndex].type !== 'human') return;
        const move = findNormalMove(playerState[currentPlayerIndex]); // Give 'normal' level hints
        if (move) {
            const pieceEl = piecePaletteEl.querySelector(`[data-piece-name='${move.pieceName}']`);
            if(pieceEl) selectPiece(move.pieceName, pieces[move.pieceName], playerState[currentPlayerIndex].id, pieceEl);
            selectedPiece.shape = move.shape;
            renderPreview();
            for (let r = 0; r < move.shape.length; r++) for (let c = 0; c < move.shape[r].length; c++) if (move.shape[r][c]) {
                const boardCell = boardEl.querySelector(`[data-r='${move.r + r}'][data-c='${move.c + c}']`);
                if (boardCell) { boardCell.classList.add('hint-flash'); setTimeout(() => boardCell.classList.remove('hint-flash'), 1200); }
            }
            messageAreaEl.textContent = 'ここにピースを配置できます。';
        } else {
            messageAreaEl.textContent = '配置可能な場所がありません。パスしてください。';
        }
    }

    // --- Human Interaction & Boilerplate ---
    function selectPiece(name, shape, playerId, element) { if (isGameOver || playerState[currentPlayerIndex].type !== 'human') return; if (selectedPiece && selectedPiece.element) selectedPiece.element.classList.remove('selected'); selectedPiece = { name, shape, player: playerId, element }; element.classList.add('selected'); renderPreview(); messageAreaEl.textContent = 'ボード上に配置してください。'; }
    function handleBoardClick(e) { if (isGameOver || !selectedPiece || playerState[currentPlayerIndex].type !== 'human' || !e.target.classList.contains('cell')) return; const r = parseInt(e.target.dataset.r, 10), c = parseInt(e.target.dataset.c, 10); if (isValidPlacement(selectedPiece.shape, r, c, playerState[currentPlayerIndex])) { placePiece(selectedPiece.name, selectedPiece.shape, r, c); nextTurn(); } else { messageAreaEl.textContent = 'その場所には配置できません。'; } }
    function renderBoard() { for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) { const cell = boardEl.querySelector(`[data-r='${r}'][data-c='${c}']`); cell.className = 'cell'; if (board[r][c] !== null) cell.classList.add(PLAYERS[board[r][c]].color); } }
    function renderPlayerInfo() { const player = playerState[currentPlayerIndex]; playerInfoEl.textContent = `${player.name}のターン`; playerInfoEl.className = `info-${player.id}`; }
    function renderPiecePalette() { piecePaletteEl.innerHTML = ''; const player = playerState[currentPlayerIndex]; if (player.type !== 'human') return; player.pieces.forEach(pieceName => { const pieceShape = pieces[pieceName]; const pieceContainer = createPieceElement(pieceName, pieceShape, player.id); pieceContainer.addEventListener('click', () => selectPiece(pieceName, pieceShape, player.id, pieceContainer)); piecePaletteEl.appendChild(pieceContainer); }); }
    function createPieceElement(name, shape, playerId) { const container = document.createElement('div'); container.classList.add('piece-container'); container.dataset.pieceName = name; const grid = document.createElement('div'); grid.classList.add('piece-grid'); grid.style.gridTemplateRows = `repeat(${shape.length}, 15px)`; grid.style.gridTemplateColumns = `repeat(${shape[0].length}, 15px)`; for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) { const cell = document.createElement('div'); cell.classList.add('piece-cell'); if (shape[r][c]) cell.classList.add(PLAYERS[playerId].color); grid.appendChild(cell); } container.appendChild(grid); return container; }
    function renderPreview() { piecePreviewEl.innerHTML = ''; if (selectedPiece) { const pieceEl = createPieceElement(selectedPiece.name, selectedPiece.shape, selectedPiece.player); piecePreviewEl.appendChild(pieceEl); } }
    function handleBoardHover(e) { if (!selectedPiece || !e.target.classList.contains('cell')) return; clearPreviews(); const r = parseInt(e.target.dataset.r, 10), c = parseInt(e.target.dataset.c, 10); const { shape } = selectedPiece; const isValid = isValidPlacement(shape, r, c, playerState[currentPlayerIndex]); for (let i = 0; i < shape.length; i++) for (let j = 0; j < shape[i].length; j++) if (shape[i][j]) { const boardCell = boardEl.querySelector(`[data-r='${r + i}'][data-c='${c + j}']`); if (boardCell) boardCell.classList.add('preview', isValid ? PLAYERS[currentPlayerIndex].color : 'player-2'); } }
    function handleBoardMouseOut(e) { clearPreviews(); }
    function clearPreviews() { document.querySelectorAll('.cell.preview').forEach(cell => { cell.classList.remove('preview', 'player-0', 'player-1', 'player-2', 'player-3'); const r = parseInt(cell.dataset.r, 10), c = parseInt(cell.dataset.c, 10); if (board[r][c] !== null) cell.classList.add(PLAYERS[board[r][c]].color); }); }
    function isValidPlacement(shape, startR, startC, player) { let touchesCorner = false, touchesEdge = false; for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) if (shape[r][c]) { const boardR = startR + r, boardC = startC + c; if (boardR < 0 || boardR >= BOARD_SIZE || boardC < 0 || boardC >= BOARD_SIZE || board[boardR][boardC] !== null) return false; if (player.isFirstMove) { if (boardR === player.corner.r && boardC === player.corner.c) touchesCorner = true; } else { [[boardR - 1, boardC], [boardR + 1, boardC], [boardR, boardC - 1], [boardR, boardC + 1]].forEach(([nr, nc]) => { if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player.id) touchesEdge = true; }); [[boardR - 1, boardC - 1], [boardR - 1, boardC + 1], [boardR + 1, boardC - 1], [boardR + 1, boardC + 1]].forEach(([nr, nc]) => { if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player.id) touchesCorner = true; }); } } if (player.isFirstMove) return touchesCorner; return touchesCorner && !touchesEdge; }
    function rotateMatrix(matrix) { const rows = matrix.length, cols = matrix[0].length; const newMatrix = Array(cols).fill(null).map(() => Array(rows).fill(0)); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) newMatrix[c][rows - 1 - r] = matrix[r][c]; return newMatrix; }
    function flipMatrix(matrix) { return matrix.map(row => row.slice().reverse()); }

    main();
});