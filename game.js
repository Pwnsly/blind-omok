class BlindOmok {
    constructor() {
        this.boardSize = 15;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1; // 1: 흑돌(플레이어), 2: 백돌(AI)
        this.gameOver = false;
        this.playerScore = 0;
        this.aiScore = 0;
        this.gameHistory = []; // 게임 기록 저장
        this.patterns = new Map(); // 승리 패턴 저장
        this.worker = null;
        this.init();
    }

    init() {
        this.createBoard();
        this.addEventListeners();
        this.updateScore();
        this.initWorker();
    }

    initWorker() {
        const workerCode = `
            self.onmessage = function(e) {
                const { board, depth } = e.data;
                const result = findBestMove(board, depth);
                self.postMessage(result);
            };

            function findBestMove(board, depth) {
                let bestScore = -Infinity;
                let bestMove = null;
                const boardSize = board.length;

                // 1. 승리 가능한 수 찾기
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0) {
                            board[i][j] = 2;
                            if (checkWin(board, i, j)) {
                                board[i][j] = 0;
                                return { row: i, col: j };
                            }
                            board[i][j] = 0;
                        }
                    }
                }

                // 2. 플레이어의 승리 수 방어
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0) {
                            board[i][j] = 1;
                            if (checkWin(board, i, j)) {
                                board[i][j] = 0;
                                return { row: i, col: j };
                            }
                            board[i][j] = 0;
                        }
                    }
                }

                // 3. 미니맥스 알고리즘으로 최적의 수 찾기
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                            board[i][j] = 2;
                            const score = minimax(board, depth - 1, false, -Infinity, Infinity);
                            board[i][j] = 0;

                            if (score > bestScore) {
                                bestScore = score;
                                bestMove = { row: i, col: j };
                            }
                        }
                    }
                }

                if (bestMove) {
                    return bestMove;
                }

                // 4. 랜덤한 수 선택
                const emptyCells = [];
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                            emptyCells.push({ row: i, col: j });
                        }
                    }
                }

                if (emptyCells.length > 0) {
                    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
                }

                return null;
            }

            function minimax(board, depth, isMaximizing, alpha, beta) {
                if (depth === 0) {
                    return evaluateBoard(board);
                }

                const boardSize = board.length;

                if (isMaximizing) {
                    let maxScore = -Infinity;
                    for (let i = 0; i < boardSize; i++) {
                        for (let j = 0; j < boardSize; j++) {
                            if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                                board[i][j] = 2;
                                const score = minimax(board, depth - 1, false, alpha, beta);
                                board[i][j] = 0;
                                maxScore = Math.max(maxScore, score);
                                alpha = Math.max(alpha, score);
                                if (beta <= alpha) break;
                            }
                        }
                    }
                    return maxScore;
                } else {
                    let minScore = Infinity;
                    for (let i = 0; i < boardSize; i++) {
                        for (let j = 0; j < boardSize; j++) {
                            if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                                board[i][j] = 1;
                                const score = minimax(board, depth - 1, true, alpha, beta);
                                board[i][j] = 0;
                                minScore = Math.min(minScore, score);
                                beta = Math.min(beta, score);
                                if (beta <= alpha) break;
                            }
                        }
                    }
                    return minScore;
                }
            }

            function evaluateBoard(board) {
                let score = 0;
                const directions = [
                    [1, 0],   // 가로
                    [0, 1],   // 세로
                    [1, 1],   // 대각선
                    [1, -1]   // 반대 대각선
                ];
                const boardSize = board.length;

                // AI(2)의 돌 평가
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 2) {
                            for (const [dx, dy] of directions) {
                                score += evaluateDirection(board, i, j, dx, dy, 2);
                            }
                        }
                    }
                }

                // 플레이어(1)의 돌 평가
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 1) {
                            for (const [dx, dy] of directions) {
                                score -= evaluateDirection(board, i, j, dx, dy, 1);
                            }
                        }
                    }
                }

                return score;
            }

            function evaluateDirection(board, row, col, dx, dy, player) {
                let score = 0;
                let count = 0;
                let open = 0;
                const boardSize = board.length;

                // 정방향 확인
                for (let i = 0; i < 5; i++) {
                    const newRow = row + dx * i;
                    const newCol = col + dy * i;
                    
                    if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                        break;
                    }

                    if (board[newRow][newCol] === player) {
                        count++;
                    } else if (board[newRow][newCol] === 0) {
                        open++;
                        break;
                    } else {
                        break;
                    }
                }

                // 역방향 확인
                for (let i = 1; i < 5; i++) {
                    const newRow = row - dx * i;
                    const newCol = col - dy * i;
                    
                    if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                        break;
                    }

                    if (board[newRow][newCol] === player) {
                        count++;
                    } else if (board[newRow][newCol] === 0) {
                        open++;
                        break;
                    } else {
                        break;
                    }
                }

                // 점수 계산
                if (count >= 5) score += 100000;
                else if (count === 4) {
                    if (open === 2) score += 10000;
                    else if (open === 1) score += 1000;
                }
                else if (count === 3) {
                    if (open === 2) score += 500;
                    else if (open === 1) score += 100;
                }
                else if (count === 2) {
                    if (open === 2) score += 50;
                    else if (open === 1) score += 10;
                }
                else if (count === 1) {
                    if (open === 2) score += 5;
                    else if (open === 1) score += 1;
                }

                return score;
            }

            function hasNeighbor(board, row, col) {
                const boardSize = board.length;
                for (let i = Math.max(0, row - 2); i <= Math.min(boardSize - 1, row + 2); i++) {
                    for (let j = Math.max(0, col - 2); j <= Math.min(boardSize - 1, col + 2); j++) {
                        if (board[i][j] !== 0) {
                            return true;
                        }
                    }
                }
                return false;
            }

            function checkWin(board, row, col) {
                const directions = [
                    [[0, 1], [0, -1]], // 가로
                    [[1, 0], [-1, 0]], // 세로
                    [[1, 1], [-1, -1]], // 대각선
                    [[1, -1], [-1, 1]] // 반대 대각선
                ];
                const boardSize = board.length;
                const player = board[row][col];

                for (const direction of directions) {
                    let count = 1;
                    
                    for (const [dx, dy] of direction) {
                        let x = row + dx;
                        let y = col + dy;
                        
                        while (
                            x >= 0 && x < boardSize &&
                            y >= 0 && y < boardSize &&
                            board[x][y] === player
                        ) {
                            count++;
                            x += dx;
                            y += dy;
                        }
                    }

                    if (count === 5) return true;
                }

                return false;
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => {
            const move = e.data;
            if (move) {
                this.makeMove(move.row, move.col);
            }
        };
    }

    createBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '<div id="game-message"></div>';
        
        for (let i = 0; i < this.boardSize; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            
            for (let j = 0; j < this.boardSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                row.appendChild(cell);
            }
            
            gameBoard.appendChild(row);
        }
    }

    addEventListeners() {
        document.getElementById('game-board').addEventListener('click', (e) => {
            if (!e.target.classList.contains('cell') || this.gameOver || this.currentPlayer !== 1) return;
            
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);
            
            if (this.board[row][col] === 0) {
                this.makeMove(row, col);
            }
        });

        document.getElementById('restart').addEventListener('click', () => {
            this.resetGame();
        });
    }

    updateScore() {
        document.getElementById('player-score').textContent = this.playerScore;
        document.getElementById('ai-score').textContent = this.aiScore;
    }

    showGameMessage(message) {
        const gameMessage = document.getElementById('game-message');
        gameMessage.textContent = message;
        gameMessage.style.display = 'block';
        
        setTimeout(() => {
            gameMessage.style.display = 'none';
        }, 2000);
    }

    makeMove(row, col) {
        if (this.board[row][col] !== 0) return false;

        this.board[row][col] = this.currentPlayer;
        this.placeStone(row, col);

        // 현재 수 기록
        this.gameHistory.push({
            row: row,
            col: col,
            player: this.currentPlayer
        });

        if (this.checkWin(row, col)) {
            this.gameOver = true;
            const message = this.currentPlayer === 1 ? '플레이어 승리!' : 'AI 승리!';
            document.getElementById('status').textContent = message;
            this.showGameMessage(message);
            
            if (this.currentPlayer === 1) {
                this.playerScore++;
            } else {
                this.aiScore++;
                // AI가 이겼을 때 패턴 학습
                this.learnPattern();
            }
            this.updateScore();
            
            this.revealAllStones();
            return true;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        document.getElementById('status').textContent = 
            this.currentPlayer === 1 ? '당신의 차례입니다 (흑돌)' : 'AI가 생각중...';

        if (this.currentPlayer === 2) {
            setTimeout(() => this.makeAIMove(), 500);
        }

        return true;
    }

    placeStone(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const stone = document.createElement('div');
        stone.className = 'stone';
        
        // 게임이 끝났을 때만 색상 표시
        if (this.gameOver) {
            if (this.board[row][col] === 1) {
                stone.classList.add('black');
            } else if (this.board[row][col] === 2) {
                stone.classList.add('white');
            }
        }
        
        cell.appendChild(stone);
    }

    revealAllStones() {
        // 모든 돌 제거
        const stones = document.querySelectorAll('.stone');
        stones.forEach(stone => stone.remove());

        // 모든 돌 다시 배치
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] !== 0) {
                    const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                    const stone = document.createElement('div');
                    stone.className = 'stone';
                    
                    if (this.board[i][j] === 1) {
                        stone.classList.add('black');
                    } else if (this.board[i][j] === 2) {
                        stone.classList.add('white');
                    }
                    
                    cell.appendChild(stone);
                }
            }
        }
    }

    makeAIMove() {
        if (this.gameOver) return;

        // 웹 워커에 현재 보드 상태와 탐색 깊이 전달
        this.worker.postMessage({
            board: this.board.map(row => [...row]),
            depth: 2 // 탐색 깊이를 2로 줄임
        });
    }

    getCurrentPattern(row, col) {
        const pattern = [];
        for (let i = Math.max(0, row - 2); i <= Math.min(this.boardSize - 1, row + 2); i++) {
            for (let j = Math.max(0, col - 2); j <= Math.min(this.boardSize - 1, col + 2); j++) {
                if (this.board[i][j] !== 0) {
                    pattern.push(`${i},${j}`);
                }
            }
        }
        return pattern.join('|');
    }

    learnPattern() {
        // 마지막 5개의 수를 패턴으로 저장
        const lastMoves = this.gameHistory.slice(-5);
        const pattern = lastMoves.map(move => `${move.row},${move.col}`).join('|');
        
        if (!this.patterns.has(pattern)) {
            this.patterns.set(pattern, 1);
        } else {
            this.patterns.set(pattern, this.patterns.get(pattern) + 1);
        }
    }

    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]], // 가로
            [[1, 0], [-1, 0]], // 세로
            [[1, 1], [-1, -1]], // 대각선
            [[1, -1], [-1, 1]] // 반대 대각선
        ];

        const player = this.board[row][col];

        for (const direction of directions) {
            let count = 1;
            
            for (const [dx, dy] of direction) {
                let x = row + dx;
                let y = col + dy;
                
                while (
                    x >= 0 && x < this.boardSize &&
                    y >= 0 && y < this.boardSize &&
                    this.board[x][y] === player
                ) {
                    count++;
                    x += dx;
                    y += dy;
                }
            }

            if (count === 5) return true;
        }

        return false;
    }

    resetGame() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.gameHistory = []; // 게임 기록 초기화
        document.getElementById('status').textContent = '당신의 차례입니다 (흑돌)';
        this.createBoard();
    }
}

// 게임 시작
const game = new BlindOmok(); 