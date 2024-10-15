// ==UserScript==
// @name         1
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Đã sợ thì đừng dùng, đã dùng thì đừng sợ
// @author       Vasyl Sheremet
// @match        https://*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hàm trợ giúp để tạo độ trễ ngẫu nhiên từ 3 đến 5 giây
    function randomDelay() {
        const min = 400;
        const max = 700;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    function randomDelay2() {
        const min = 1000;
        const max = 2000;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    function clickAtCoordinates(x, y) {
        const event = new MouseEvent('click', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true
        });
        const element = document.elementFromPoint(x, y);
        if (element) {
            element.dispatchEvent(event);
        }
    }

    // Chờ trang web tải hoàn toàn
    window.addEventListener('load', function() {
        // Khởi tạo bản đồ trò chơi
        const rows = 9;
        const cols = 6;
        let gameMap = Array.from({ length: rows }, () => Array(cols).fill(null));

        // Hàm để cập nhật trạng thái của ô
        function updateGameMap() {
            const cells = document.querySelectorAll('section._minesweeper_nndwd_1 [class^="_field_"]');
            if (cells.length !== rows * cols) {
                console.warn(`Số lượng ô không khớp: expected ${rows * cols}, found ${cells.length}`);
            }

            cells.forEach((cell, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const img = cell.querySelector('img');

                if (cell.classList.contains('open')) {
                    if (img) {
                        if (img.classList.contains('_emptyCell_18ovs_54')) {
                            gameMap[row][col] = 0; // Ô trống không bom
                        } else {
                            const altText = img.getAttribute('alt');
                            if (altText) {
                                if (altText.startsWith('Coin')) {
                                    const number = parseInt(altText.replace('Coin ', ''));
                                    gameMap[row][col] = number; // Số 1-4
                                } else if (altText === 'Block') {
                                    gameMap[row][col] = 'bomb'; // Ô bom
                                } else {
                                    gameMap[row][col] = 0; // Ô trống không bom
                                }
                            } else {
                                gameMap[row][col] = 0; // Ô trống không bom
                            }
                        }
                    } else {
                        gameMap[row][col] = 0; // Ô trống không bom
                    }
                } else {
                    // Kiểm tra xem ô có bị đánh dấu cờ không
                    let isFlagged = false;

                    // Kiểm tra xem có div với class '_flagAnimation_18ovs_13' không
                    const flagAnimation = cell.querySelector('div[class^="_flagAnimation_"]');
                    if (flagAnimation) {
                        isFlagged = true;
                    }

                    // Kiểm tra xem có hình ảnh cờ với alt chứa 'flag' không
                    if (img && img.getAttribute('alt') && img.getAttribute('alt').toLowerCase().includes('flag')) {
                        isFlagged = true;
                    }

                    if (isFlagged) {
                        gameMap[row][col] = 'flag';
                    } else {
                        gameMap[row][col] = null; // Ô chưa mở
                    }
                }
            });
            console.clear();
            console.log('Game Map:', JSON.parse(JSON.stringify(gameMap)));
        }

        // Hàm kiểm tra các ô xung quanh
        function getNeighbors(row, col) {
            const neighbors = [];
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        if (!(r === row && c === col)) {
                            neighbors.push({ row: r, col: c });
                        }
                    }
                }
            }
            return neighbors;
        }

        // Chiến thuật cơ bản (async)
        async function applyStrategy() {
            let actionTaken = false;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (gameMap[r][c] && gameMap[r][c] > 0) {
                        const neighbors = getNeighbors(r, c);
                        const flagged = neighbors.filter(n => gameMap[n.row][n.col] === 'flag').length;
                        const hidden = neighbors.filter(n => gameMap[n.row][n.col] === null).length;

                        // Nếu số bom xung quanh bằng số cờ đã đánh dấu, mở các ô còn lại
                        if (flagged === gameMap[r][c]) {
                            for (let n of neighbors) {
                                if (gameMap[n.row][n.col] === null) {
                                    await clickCell(n.row, n.col);
                                    actionTaken = true;
                                }
                            }
                        }

                        // Nếu số bom xung quanh bằng số ô chưa mở, đánh dấu tất cả các ô đó là bom
                        if (hidden > 0 && (gameMap[r][c] - flagged) === hidden) {
                            for (let n of neighbors) {
                                if (gameMap[n.row][n.col] === null && gameMap[n.row][n.col] !== 'flag') {
                                    await flagCell(n.row, n.col);
                                    actionTaken = true;
                                }
                            }
                        }
                    }
                }
            }

            if (!actionTaken) {
                // Nếu không có hành động nào được thực hiện, thử mở một ô ngẫu nhiên
                await openRandomCell();
            }
        }

        // Hàm click vào ô (async)
        async function clickCell(row, col) {
            const index = row * cols + col;
            const cells = document.querySelectorAll('section._minesweeper_nndwd_1 [class^="_field_"]');
            const cell = cells[index];
            if (cell) {
                const rect = cell.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                clickAtCoordinates(x, y);
                console.log(`Click vào ô (${row}, ${col})`);
                await randomDelay();
            } else {
                console.warn(`Không tìm thấy ô để click tại (${row}, ${col})`);
            }
        }

        // Hàm đánh dấu cờ vào ô (async)
        async function flagCell(row, col) {
            // Kiểm tra nếu ô đã được đánh dấu cờ thì không làm gì
            if (gameMap[row][col] === 'flag') {
                console.log(`Ô (${row}, ${col}) đã được đánh dấu cờ, bỏ qua.`);
                return;
            }

            // Tìm và click vào phần tử flag icon
            const flagIconContainer = document.querySelector('div._mode-icon-container_1ps9r_44');
            if (!flagIconContainer) {
                console.warn('Không tìm thấy container của flag icon');
                return;
            }

            const flagIcon = flagIconContainer.querySelector('img._icon_1ps9r_38.flag');
            if (!flagIcon) {
                console.warn('Không tìm thấy flag icon');
                return;
            }

            // Click vào flag icon để kích hoạt chế độ đánh dấu cờ
            const flagIconRect = flagIcon.getBoundingClientRect();
            clickAtCoordinates(flagIconRect.left + flagIconRect.width / 2, flagIconRect.top + flagIconRect.height / 2);
            console.log('Đã kích hoạt chế độ đánh dấu cờ');

            // Chờ ngẫu nhiên từ 3 đến 5 giây để chế độ đánh dấu cờ được kích hoạt
            await randomDelay();

            // Click vào ô cần đánh dấu cờ
            const index = row * cols + col;
            const cells = document.querySelectorAll('section._minesweeper_nndwd_1 [class^="_field_"]');
            const cell = cells[index];
            if (cell) {
                // Kiểm tra xem ô có class '_flagAnimation_18ovs_13' không để tránh đánh dấu lại
                const flagAnimation = cell.querySelector('div[class^="_flagAnimation_"]');
                if (flagAnimation) {
                    console.log(`Ô (${row}, ${col}) đã được đánh dấu cờ trước đó, bỏ qua.`);
                } else {
                    const cellRect = cell.getBoundingClientRect();
                    clickAtCoordinates(cellRect.left + cellRect.width / 2, cellRect.top + cellRect.height / 2);
                    gameMap[row][col] = 'flag';
                    console.log(`Đánh dấu cờ vào ô (${row}, ${col})`);
                }
            } else {
                console.warn(`Không tìm thấy ô để đánh dấu cờ tại (${row}, ${col})`);
            }

            // Chờ ngẫu nhiên từ 3 đến 5 giây trước khi quay lại chế độ mở ô
            await randomDelay();

            // Click lại vào flag icon để quay lại chế độ mở ô
            clickAtCoordinates(flagIconRect.left + flagIconRect.width / 2, flagIconRect.top + flagIconRect.height / 2);
            console.log('Đã quay lại chế độ mở ô');

            // Chờ thêm ngẫu nhiên từ 3 đến 5 giây để đảm bảo chế độ đã được chuyển
            await randomDelay();
        }

        // Hàm mở một ô ngẫu nhiên chưa mở (async)
        async function openRandomCell() {
            const hiddenCells = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (gameMap[r][c] === null) {
                        hiddenCells.push({ row: r, col: c });
                    }
                }
            }

            if (hiddenCells.length === 0) {
                console.log('Không còn ô nào để mở.');
                return;
            }

            // Chọn một ô ngẫu nhiên
            const randomIndex = Math.floor(Math.random() * hiddenCells.length);
            const cell = hiddenCells[randomIndex];
            await clickCell(cell.row, cell.col);
        }

        async function autoPlay() {
            updateGameMap();
            await applyStrategy();
        }

        // Hàm để click vào nút "Play Now" hoặc "Play Again"
        async function clickPlayButton() {
            const playNowButton = document.querySelector('button.btn.primary-btn[class*="_button_"]');
            const playAgainButton = document.querySelector('button.btn.primary-btn');

            if (playNowButton && playNowButton.textContent.trim() === 'Play Now') {
                const rect = playNowButton.getBoundingClientRect();
                clickAtCoordinates(rect.left + rect.width / 2, rect.top + rect.height / 2);
                console.log('Bắt đầu chơi');
                await randomDelay();
            } else if (playAgainButton && playAgainButton.textContent.trim() === 'Play Again') {
                console.log('Hoàn thành game, chờ ngẫu nhiên từ 10 đến 15 giây để chơi lại');
                await randomDelay2();
                const rect = playAgainButton.getBoundingClientRect();
                clickAtCoordinates(rect.left + rect.width / 2, rect.top + rect.height / 2);
                console.log('Bắt đầu chơi lại');
                await randomDelay();
            }
        }

        // Hàm khởi động Auto Play
        async function startAutoPlay() {
            while (true) {
                await clickPlayButton();
                await autoPlay();
                await randomDelay();
            }
        }

        startAutoPlay();

    }, false);
})();