// Custom Pong Game Logic
// Moved from CustomPaddle.html

// AI module functions are now directly included here
// For more modular development with ES modules, use a local server

// Game state
let gameState = 'setup';
let twoPlayerMode = false;
let paddleData1 = [];
let paddleData2 = [];
let gameSettings = {
	ballSpeed: 2,
	paddleScale: 3,
	winScore: 11,
	speedIncrease: true,
	aiDifficulty: 5,
	player1Color: '#00ffff',
	player2Color: '#ff00ff'
};
// Paddle editor state for click and drag
let paddleEditor = {
	isDragging: false,
	currentPlayer: null,
	dragMode: null // 'draw' or 'erase'
};
let gameData = {
	ball: { x: 450, y: 250, vx: 2, vy: 1.5, size: 12, baseSpeed: 2 },
	player1: { x: 50, y: 200, vx: 0, vy: 0, score: 0 },
	player2: { x: 650, y: 200, vx: 0, vy: 0, score: 0 },
	keys: {},
	paddleSpeed: 4,
	speedMultiplier: 1,
	rallies: 0,
	aiState: { 
		target: { x: 650, y: 200 }, 
		lastBallX: 0,
		aggressiveness: 0.5,
		timeSinceLastMove: 0
	}
};

// Initialize paddle grids
function initializePaddleGrids() {
	paddleData1 = Array(16).fill().map(() => Array(16).fill(false));
	paddleData2 = Array(16).fill().map(() => Array(16).fill(false));
	createGrid('paddleGrid1', 1);
	createGrid('paddleGrid2', 2);
	// Load default paddles
	loadPreset('rectangle', 1);
	loadPreset('rectangle', 2);
	// Initialize the logo with the paddle designs
	updateLogoWithPaddleDesigns();
}

function createGrid(gridId, playerNum) {
	const grid = document.getElementById(gridId);
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			const pixel = document.createElement('div');
			pixel.className = `pixel player${playerNum}`;
			// Mouse events for click and drag
			pixel.addEventListener('mousedown', (e) => startPixelDrag(e, x, y, playerNum));
			pixel.addEventListener('mouseenter', (e) => continuePixelDrag(e, x, y, playerNum));
			pixel.addEventListener('mouseup', () => endPixelDrag());
			// Prevent default drag behavior and context menu
			pixel.addEventListener('dragstart', (e) => e.preventDefault());
			pixel.addEventListener('contextmenu', (e) => e.preventDefault());
			pixel.dataset.x = x;
			pixel.dataset.y = y;
			pixel.dataset.player = playerNum;
			grid.appendChild(pixel);
		}
	}
	// Add global mouse up listener to handle drag ending outside grid
	document.addEventListener('mouseup', endPixelDrag);
}

function togglePixel(x, y, playerNum) {
	if (playerNum === 1) {
		paddleData1[y][x] = !paddleData1[y][x];
	} else {
		paddleData2[y][x] = !paddleData2[y][x];
	}
	updateGridDisplay();
}

function startPixelDrag(e, x, y, playerNum) {
	e.preventDefault();
	paddleEditor.isDragging = true;
	paddleEditor.currentPlayer = playerNum;
	// Determine if we're drawing or erasing based on current pixel state
	const paddleData = playerNum === 1 ? paddleData1 : paddleData2;
	const currentState = paddleData[y][x];
	paddleEditor.dragMode = currentState ? 'erase' : 'draw';
	// Apply the initial change
	setPixel(x, y, playerNum, paddleEditor.dragMode === 'draw');
}

function continuePixelDrag(e, x, y, playerNum) {
	if (paddleEditor.isDragging && paddleEditor.currentPlayer === playerNum) {
		setPixel(x, y, playerNum, paddleEditor.dragMode === 'draw');
	}
}

function endPixelDrag() {
	paddleEditor.isDragging = false;
	paddleEditor.currentPlayer = null;
	paddleEditor.dragMode = null;
}

function setPixel(x, y, playerNum, state) {
	if (playerNum === 1) {
		paddleData1[y][x] = state;
	} else {
		paddleData2[y][x] = state;
	}
	updateGridDisplay();
}

function updateGridDisplay() {
	// Update CSS custom properties for colors
	document.documentElement.style.setProperty('--player1-color', gameSettings.player1Color);
	document.documentElement.style.setProperty('--player2-color', gameSettings.player2Color);
	
	const pixels1 = document.querySelectorAll('#paddleGrid1 .pixel');
	const pixels2 = document.querySelectorAll('#paddleGrid2 .pixel');
	
	pixels1.forEach(pixel => {
		const x = parseInt(pixel.dataset.x);
		const y = parseInt(pixel.dataset.y);
		pixel.classList.toggle('active', paddleData1[y][x]);
	});
	
	pixels2.forEach(pixel => {
		const x = parseInt(pixel.dataset.x);
		const y = parseInt(pixel.dataset.y);
		pixel.classList.toggle('active', paddleData2[y][x]);
	});
	
	// Update SVG previews
	updatePaddlePreview(1, paddleData1);
	updatePaddlePreview(2, paddleData2);
	
	// Update the logo with the custom paddle designs
	updateLogoWithPaddleDesigns();
}

/**
 * Updates the SVG preview for a paddle based on grid data
 * @param {number} playerNum - The player number (1 or 2)
 * @param {Array} paddleData - The 2D array of pixel data
 */
function updatePaddlePreview(playerNum, paddleData) {
	const svg = document.getElementById(`paddlePreview${playerNum}`);
	const playerColor = playerNum === 1 ? gameSettings.player1Color : gameSettings.player2Color;
	
	// Clear existing content
	svg.innerHTML = '';
	
	// Add background grid
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			const gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			gridRect.setAttribute('x', x);
			gridRect.setAttribute('y', y);
			gridRect.setAttribute('width', 1);
			gridRect.setAttribute('height', 1);
			gridRect.setAttribute('fill', '#333');
			gridRect.setAttribute('stroke', '#444');
			gridRect.setAttribute('stroke-width', '0.05');
			svg.appendChild(gridRect);
		}
	}
	
	// Add active pixels
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			if (paddleData[y][x]) {
				const pixelRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
				pixelRect.setAttribute('x', x);
				pixelRect.setAttribute('y', y);
				pixelRect.setAttribute('width', 1);
				pixelRect.setAttribute('height', 1);
				pixelRect.setAttribute('fill', playerColor);
				// Add glow effect for active pixels
				pixelRect.setAttribute('filter', `drop-shadow(0 0 0.2 ${playerColor})`);
				svg.appendChild(pixelRect);
			}
		}
	}
}

/**
 * Updates the game logo SVG with the current paddle designs
 */
function updateLogoWithPaddleDesigns() {
	// Get references to logo elements
	const logoSvg = document.querySelector('.game-logo');
	const player1Group = logoSvg.querySelector('.player1-elements');
	const player2Group = logoSvg.querySelector('.player2-elements');
	
	// Clear existing paddle elements
	while (player1Group.firstChild) {
		player1Group.removeChild(player1Group.firstChild);
	}
	
	while (player2Group.firstChild) {
		player2Group.removeChild(player2Group.firstChild);
	}
	
	// Scale factor for converting 16x16 grid to logo size
	const pixelSize = 5;
	const gridCenter = 7.5; // Center point of the 16x16 grid (halfway between 0-15)
	
	// Add Player 1 paddle (left side)
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			if (paddleData1[y][x]) {
				const pixelRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
				// Calculate position, centering the paddle in the available space
				// Map from 16x16 grid to logo space, offsetting to center
				const xPos = x * pixelSize - (gridCenter * pixelSize - 30/2);
				const yPos = (y - gridCenter) * pixelSize;
				
				pixelRect.setAttribute('x', xPos);
				pixelRect.setAttribute('y', yPos);
				pixelRect.setAttribute('width', pixelSize);
				pixelRect.setAttribute('height', pixelSize);
				pixelRect.setAttribute('fill', 'var(--player1-color, #00ffff)');
				player1Group.appendChild(pixelRect);
			}
		}
	}
	
	// Add Player 2 paddle (right side)
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			if (paddleData2[y][x]) {
				const pixelRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
				// Calculate position, centering the paddle in the available space
				// For player 2, we need to flip the x-coordinate
				const xPos = (15-x) * pixelSize - (gridCenter * pixelSize - 30/2);
				const yPos = (y - gridCenter) * pixelSize;
				
				pixelRect.setAttribute('x', xPos);
				pixelRect.setAttribute('y', yPos);
				pixelRect.setAttribute('width', pixelSize);
				pixelRect.setAttribute('height', pixelSize);
				pixelRect.setAttribute('fill', 'var(--player2-color, #ff00ff)');
				player2Group.appendChild(pixelRect);
			}
		}
	}
}

function toggleSettings() {
	const content = document.getElementById('settingsContent');
	const toggle = document.querySelector('.settings-toggle');
	content.classList.toggle('collapsed');
	toggle.classList.toggle('collapsed');
}

function loadPreset(type, playerNum) {
	const paddleData = playerNum === 1 ? paddleData1 : paddleData2;
	// Clear the array
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			paddleData[y][x] = false;
		}
	}
	switch (type) {
		case 'rectangle':
			for (let y = 4; y < 12; y++) {
				for (let x = 6; x < 10; x++) {
					paddleData[y][x] = true;
				}
			}
			break;
		case 'diamond':
			const center = 8;
			for (let y = 0; y < 16; y++) {
				for (let x = 0; x < 16; x++) {
					const dist = Math.abs(x - center) + Math.abs(y - center);
					if (dist <= 5 && dist >= 3) {
						paddleData[y][x] = true;
					}
				}
			}
			break;
		case 'cross':
			for (let i = 4; i < 12; i++) {
				paddleData[i][7] = true;
				paddleData[i][8] = true;
				paddleData[7][i] = true;
				paddleData[8][i] = true;
			}
			break;
		case 'circle':
			const cx = 8, cy = 8, radius = 4;
			for (let y = 0; y < 16; y++) {
				for (let x = 0; x < 16; x++) {
					const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
					if (dist <= radius && dist >= radius - 1.5) {
						paddleData[y][x] = true;
					}
				}
			}
			break;
	}
	updateGridDisplay();
}

function clearGrid(playerNum) {
	if (playerNum === 1) {
		paddleData1 = Array(16).fill().map(() => Array(16).fill(false));
	} else {
		paddleData2 = Array(16).fill().map(() => Array(16).fill(false));
	}
	updateGridDisplay();
}

function updateSettings() {
	gameSettings.ballSpeed = parseFloat(document.getElementById('ballSpeed').value);
	gameSettings.paddleScale = parseInt(document.getElementById('paddleScale').value);
	gameSettings.winScore = parseInt(document.getElementById('winScore').value);
	gameSettings.speedIncrease = document.getElementById('speedIncrease').checked;
	gameSettings.aiDifficulty = parseInt(document.getElementById('aiDifficulty').value);
	gameSettings.player1Color = document.getElementById('player1Color').value;
	gameSettings.player2Color = document.getElementById('player2Color').value;
	document.getElementById('ballSpeedValue').textContent = gameSettings.ballSpeed;
	document.getElementById('paddleScaleValue').textContent = gameSettings.paddleScale + 'x';
	
	// Use AI module function to get difficulty name
	const difficultyName = getAIDifficultyName(gameSettings.aiDifficulty);
	document.getElementById('aiDifficultyValue').textContent = gameSettings.aiDifficulty + ' - ' + difficultyName;
	
	// Update paddle grid colors
	updateGridDisplay();
}

function startGame(twoPlayer) {
	// Check if paddles have at least one pixel
	const hasPixels1 = paddleData1.some(row => row.some(pixel => pixel));
	const hasPixels2 = paddleData2.some(row => row.some(pixel => pixel));
	if (!hasPixels1 || !hasPixels2) {
		alert('Please design both paddles first!');
		return;
	}
	updateSettings();
	twoPlayerMode = twoPlayer;
	gameState = 'playing';
	document.getElementById('setupScreen').classList.add('hidden');
	document.getElementById('gameContainer').classList.remove('hidden');
	document.getElementById('gameMode').textContent = twoPlayer ? '2 Player' : '1 Player vs AI';
	document.getElementById('targetScore').textContent = gameSettings.winScore;
	resetGame();
	gameLoop();
}

function resetGame() {
	const baseSpeed = gameSettings.ballSpeed;
	gameData.ball = { 
		x: 450, y: 250, 
		vx: baseSpeed, vy: baseSpeed * 0.7, 
		size: 12, 
		baseSpeed: baseSpeed 
	};
	gameData.player1 = { x: 50, y: 200, vx: 0, vy: 0, score: gameData.player1.score };
	gameData.player2 = { x: 650, y: 200, vx: 0, vy: 0, score: gameData.player2.score };
	gameData.speedMultiplier = 1;
	gameData.rallies = 0;
	// Reset AI state
	gameData.aiState = { 
		target: { x: 650, y: 200 }, 
		lastBallX: 0,
		aggressiveness: 0.5,
		timeSinceLastMove: 0
	};
	// Randomize ball direction
	gameData.ball.vx = Math.random() > 0.5 ? baseSpeed : -baseSpeed;
	gameData.ball.vy = (Math.random() - 0.5) * baseSpeed;
	updateSpeedDisplay();
}

function resetScores() {
	gameData.player1.score = 0;
	gameData.player2.score = 0;
	updateScoreDisplay();
}

function updateScoreDisplay() {
	document.getElementById('score1').textContent = gameData.player1.score;
	document.getElementById('score2').textContent = gameData.player2.score;
}

function updateSpeedDisplay() {
	const currentSpeed = gameData.ball.baseSpeed * gameData.speedMultiplier;
	document.getElementById('currentSpeed').textContent = currentSpeed.toFixed(1);
}

function handleInput() {
	const speed = gameData.paddleSpeed;
	// Player 1 (WASD)
	gameData.player1.vx = 0;
	gameData.player1.vy = 0;
	if (gameData.keys['KeyW']) gameData.player1.vy = -speed;
	if (gameData.keys['KeyS']) gameData.player1.vy = speed;
	if (gameData.keys['KeyA']) gameData.player1.vx = -speed;
	if (gameData.keys['KeyD']) gameData.player1.vx = speed;
	
	// Player 2 (IJKL keys or AI)
	if (twoPlayerMode) {
		gameData.player2.vx = 0;
		gameData.player2.vy = 0;
		if (gameData.keys['KeyI']) gameData.player2.vy = -speed;
		if (gameData.keys['KeyK']) gameData.player2.vy = speed;
		if (gameData.keys['KeyJ']) gameData.player2.vx = -speed;
		if (gameData.keys['KeyL']) gameData.player2.vx = speed;
	} else {
		// Use AI for computer player
		const aiMovement = calculateAIMovement(
			gameData.ball,
			gameData.player2,
			gameData.aiState,
			gameSettings.aiDifficulty,
			16 * gameSettings.paddleScale,
			speed
		);
		
		// Apply AI calculated movement
		gameData.player2.vx = aiMovement.vx;
		gameData.player2.vy = aiMovement.vy;
	}
}

function updatePaddles() {
	const paddleSize = 16 * gameSettings.paddleScale;
	const canvasWidth = 900;
	const sectionWidth = canvasWidth / 3; // 300px per section
	// Update player 1 position with bounds
	gameData.player1.x += gameData.player1.vx;
	gameData.player1.y += gameData.player1.vy;
	// Constrain player 1 to left third (0-300px minus paddle size)
	gameData.player1.x = Math.max(10, Math.min(sectionWidth - paddleSize - 10, gameData.player1.x));
	gameData.player1.y = Math.max(10, Math.min(500 - paddleSize - 10, gameData.player1.y));
	// Update player 2 position with bounds
	gameData.player2.x += gameData.player2.vx;
	gameData.player2.y += gameData.player2.vy;
	// Constrain player 2 to right third (600-900px)
	gameData.player2.x = Math.max(sectionWidth * 2 + 10, Math.min(canvasWidth - paddleSize - 10, gameData.player2.x));
	gameData.player2.y = Math.max(10, Math.min(500 - paddleSize - 10, gameData.player2.y));
}

function checkPaddleCollision(player) {
	const ball = gameData.ball;
	const paddle = gameData[player];
	const paddleSize = 16 * gameSettings.paddleScale;
	const paddleData = player === 'player1' ? paddleData1 : paddleData2;
	if (ball.x + ball.size < paddle.x || ball.x > paddle.x + paddleSize ||
		ball.y + ball.size < paddle.y || ball.y > paddle.y + paddleSize) {
		return false;
	}
	const ballCenterX = ball.x + ball.size / 2;
	const ballCenterY = ball.y + ball.size / 2;
	const ballRadius = ball.size / 2;
	let collisions = [];
	for (let py = 0; py < 16; py++) {
		for (let px = 0; px < 16; px++) {
			if (paddleData[py][px]) {
				const pixelX = paddle.x + px * gameSettings.paddleScale;
				const pixelY = paddle.y + py * gameSettings.paddleScale;
				const pixelSize = gameSettings.paddleScale;
				const pixelCenterX = pixelX + pixelSize / 2;
				const pixelCenterY = pixelY + pixelSize / 2;
				const dx = ballCenterX - pixelCenterX;
				const dy = ballCenterY - pixelCenterY;
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance < ballRadius + pixelSize / 2) {
					collisions.push({
						x: pixelCenterX,
						y: pixelCenterY,
						px: px,
						py: py,
						distance: distance,
						dx: dx,
						dy: dy
					});
				}
			}
		}
	}
	if (collisions.length === 0) return false;
	let finalNormalX = 0;
	let finalNormalY = 0;
	let maxPenetration = 0;
	if (collisions.length === 1) {
		const collision = collisions[0];
		finalNormalX = collision.dx;
		finalNormalY = collision.dy;
		maxPenetration = (ballRadius + gameSettings.paddleScale / 2) - collision.distance;
	} else {
		let isTrapped = false;
		let hasLeft = false, hasRight = false, hasTop = false, hasBottom = false;
		for (let collision of collisions) {
			if (collision.dx < -ballRadius * 0.5) hasLeft = true;
			if (collision.dx > ballRadius * 0.5) hasRight = true;
			if (collision.dy < -ballRadius * 0.5) hasTop = true;
			if (collision.dy > ballRadius * 0.5) hasBottom = true;
		}
		isTrapped = (hasLeft && hasRight) || (hasTop && hasBottom);
		if (isTrapped) {
			finalNormalX = -Math.sign(ball.vx);
			finalNormalY = -Math.sign(ball.vy);
			if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
				const ballRelativeX = ballCenterX - (paddle.x + paddleSize / 2);
				const ballRelativeY = ballCenterY - (paddle.y + paddleSize / 2);
				if (Math.abs(ballRelativeX) > Math.abs(ballRelativeY)) {
					finalNormalX = Math.sign(ballRelativeX);
					finalNormalY = 0;
				} else {
					finalNormalX = 0;
					finalNormalY = Math.sign(ballRelativeY);
				}
			}
			maxPenetration = ballRadius;
		} else {
			let totalWeight = 0;
			for (let collision of collisions) {
				const penetration = (ballRadius + gameSettings.paddleScale / 2) - collision.distance;
				if (penetration > 0) {
					const weight = penetration * penetration;
					finalNormalX += collision.dx * weight;
					finalNormalY += collision.dy * weight;
					totalWeight += weight;
					maxPenetration = Math.max(maxPenetration, penetration);
				}
			}
			if (totalWeight > 0) {
				finalNormalX /= totalWeight;
				finalNormalY /= totalWeight;
			}
		}
	}
	const normalLength = Math.sqrt(finalNormalX * finalNormalX + finalNormalY * finalNormalY);
	if (normalLength > 0) {
		finalNormalX /= normalLength;
		finalNormalY /= normalLength;
	} else {
		finalNormalX = ballCenterX - (paddle.x + paddleSize / 2);
		finalNormalY = ballCenterY - (paddle.y + paddleSize / 2);
		const fallbackLength = Math.sqrt(finalNormalX * finalNormalX + finalNormalY * finalNormalY);
		if (fallbackLength > 0) {
			finalNormalX /= fallbackLength;
			finalNormalY /= fallbackLength;
		}
	}
	if (maxPenetration > 0) {
		ball.x += finalNormalX * maxPenetration;
		ball.y += finalNormalY * maxPenetration;
	}
	const relativeVelX = ball.vx - paddle.vx;
	const relativeVelY = ball.vy - paddle.vy;
	const velAlongNormal = relativeVelX * finalNormalX + relativeVelY * finalNormalY;
	if (velAlongNormal > 0 && collisions.length === 1) return false;
	const restitution = 0.95;
	const impulse = -(1 + restitution) * velAlongNormal;
	ball.vx = relativeVelX + impulse * finalNormalX;
	ball.vy = relativeVelY + impulse * finalNormalY;
	ball.vx += paddle.vx * 0.3;
	ball.vy += paddle.vy * 0.3;
	const minHorizontalSpeed = ball.baseSpeed * gameData.speedMultiplier * 0.5;
	if (Math.abs(ball.vx) < minHorizontalSpeed) {
		ball.vx = Math.sign(ball.vx || (Math.random() > 0.5 ? 1 : -1)) * minHorizontalSpeed;
	}
	const maxSpeed = ball.baseSpeed * gameData.speedMultiplier * 2.5;
	const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
	if (speed > maxSpeed) {
		ball.vx = (ball.vx / speed) * maxSpeed;
		ball.vy = (ball.vy / speed) * maxSpeed;
	}
	gameData.rallies++;
	if (gameSettings.speedIncrease && gameData.rallies % 5 === 0) {
		gameData.speedMultiplier = Math.min(gameData.speedMultiplier + 0.1, 2.5);
		updateSpeedDisplay();
	}
	return true;
}

function updateBall() {
	const ball = gameData.ball;
	const prevX = ball.x;
	const prevY = ball.y;
	ball.x += ball.vx;
	ball.y += ball.vy;
	if (ball.y <= 0 || ball.y >= 500 - ball.size) {
		ball.vy = -ball.vy;
		ball.y = Math.max(0, Math.min(500 - ball.size, ball.y));
	}
	let collisionOccurred = false;
	let collisionAttempts = 0;
	const maxCollisionAttempts = 3;
	while (!collisionOccurred && collisionAttempts < maxCollisionAttempts) {
		collisionAttempts++;
		if (ball.vx < 0) {
			if (checkPaddleCollision('player1')) {
				collisionOccurred = true;
			}
		} else if (ball.vx > 0) {
			if (checkPaddleCollision('player2')) {
				collisionOccurred = true;
			}
		}
		if (collisionOccurred) {
			const player = ball.vx > 0 ? 'player2' : 'player1';
			const paddle = gameData[player];
			const paddleSize = 16 * gameSettings.paddleScale;
			if (ball.x + ball.size > paddle.x && ball.x < paddle.x + paddleSize &&
				ball.y + ball.size > paddle.y && ball.y < paddle.y + paddleSize) {
				const paddleData = player === 'player1' ? paddleData1 : paddleData2;
				const ballCenterX = ball.x + ball.size / 2;
				const ballCenterY = ball.y + ball.size / 2;
				const ballRadius = ball.size / 2;
				let stillColliding = false;
				for (let py = 0; py < 16 && !stillColliding; py++) {
					for (let px = 0; px < 16 && !stillColliding; px++) {
						if (paddleData[py][px]) {
							const pixelX = paddle.x + px * gameSettings.paddleScale;
							const pixelY = paddle.y + py * gameSettings.paddleScale;
							const pixelSize = gameSettings.paddleScale;
							const pixelCenterX = pixelX + pixelSize / 2;
							const pixelCenterY = pixelY + pixelSize / 2;
							const distance = Math.sqrt(
								(ballCenterX - pixelCenterX) ** 2 + 
								(ballCenterY - pixelCenterY) ** 2
							);
							if (distance < ballRadius + pixelSize / 2) {
								stillColliding = true;
							}
						}
					}
				}
				if (stillColliding) {
					collisionOccurred = false;
				}
			}
		}
	}
	if (collisionAttempts >= maxCollisionAttempts) {
		const player1 = gameData.player1;
		const player2 = gameData.player2;
		const ballCenterX = ball.x + ball.size / 2;
		const ballCenterY = ball.y + ball.size / 2;
		const ballRadius = ball.size / 2;
		let stuckInPlayer1 = false;
		for (let py = 0; py < 16 && !stuckInPlayer1; py++) {
			for (let px = 0; px < 16 && !stuckInPlayer1; px++) {
				if (paddleData1[py][px]) {
					const pixelX = player1.x + px * gameSettings.paddleScale;
					const pixelY = player1.y + py * gameSettings.paddleScale;
					const pixelSize = gameSettings.paddleScale;
					const pixelCenterX = pixelX + pixelSize / 2;
					const pixelCenterY = pixelY + pixelSize / 2;
					const distance = Math.sqrt(
						(ballCenterX - pixelCenterX) ** 2 + 
						(ballCenterY - pixelCenterY) ** 2
					);
					if (distance < ballRadius + pixelSize / 2) {
						stuckInPlayer1 = true;
					}
				}
			}
		}
		let stuckInPlayer2 = false;
		for (let py = 0; py < 16 && !stuckInPlayer2; py++) {
			for (let px = 0; px < 16 && !stuckInPlayer2; px++) {
				if (paddleData2[py][px]) {
					const pixelX = player2.x + px * gameSettings.paddleScale;
					const pixelY = player2.y + py * gameSettings.paddleScale;
					const pixelSize = gameSettings.paddleScale;
					const pixelCenterX = pixelX + pixelSize / 2;
					const pixelCenterY = pixelY + pixelSize / 2;
					const distance = Math.sqrt(
						(ballCenterX - pixelCenterX) ** 2 + 
						(ballCenterY - pixelCenterY) ** 2
					);
					if (distance < ballRadius + pixelSize / 2) {
						stuckInPlayer2 = true;
					}
				}
			}
		}
		if (stuckInPlayer1) {
			ball.x = player1.x + 16 * gameSettings.paddleScale + 5;
			ball.vx = Math.abs(ball.vx);
		} else if (stuckInPlayer2) {
			ball.x = player2.x - ball.size - 5;
			ball.vx = -Math.abs(ball.vx);
		}
	}
	if (ball.x < -ball.size) {
		gameData.player2.score++;
		updateScoreDisplay();
		checkGameEnd();
		resetGame();
	} else if (ball.x > 900) {
		gameData.player1.score++;
		updateScoreDisplay();
		checkGameEnd();
		resetGame();
	}
}

function checkGameEnd() {
	if (gameData.player1.score >= gameSettings.winScore || gameData.player2.score >= gameSettings.winScore) {
		gameState = 'gameOver';
		const winner = gameData.player1.score >= gameSettings.winScore ? 'Player 1' : 'Player 2';
		document.getElementById('winnerText').textContent = `${winner} Wins!`;
		document.getElementById('finalScore').textContent = 
			`${gameData.player1.score} - ${gameData.player2.score}`;
		document.getElementById('gameOver').classList.remove('hidden');
	}
}

function drawPaddle(ctx, player, paddleData) {
	const paddle = gameData[player];
	const scale = gameSettings.paddleScale;
	ctx.fillStyle = player === 'player1' ? gameSettings.player1Color : gameSettings.player2Color;
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			if (paddleData[y][x]) {
				ctx.fillRect(
					paddle.x + x * scale, 
					paddle.y + y * scale, 
					scale, 
					scale
				);
			}
		}
	}
}

function render() {
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, 900, 500);
	ctx.strokeStyle = '#333';
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.moveTo(450, 0);
	ctx.lineTo(450, 500);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.strokeStyle = '#222';
	ctx.strokeRect(10, 10, 280, 480);
	ctx.strokeRect(610, 10, 280, 480);
	ctx.strokeStyle = '#111';
	ctx.strokeRect(300, 10, 300, 480);
	drawPaddle(ctx, 'player1', paddleData1);
	drawPaddle(ctx, 'player2', paddleData2);
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.arc(gameData.ball.x + gameData.ball.size/2, gameData.ball.y + gameData.ball.size/2, gameData.ball.size/2, 0, 2 * Math.PI);
	ctx.fill();
}

function gameLoop() {
	if (gameState !== 'playing') return;
	handleInput();
	updatePaddles();
	updateBall();
	render();
	requestAnimationFrame(gameLoop);
}

function returnToSetup() {
	gameState = 'setup';
	document.getElementById('gameContainer').classList.add('hidden');
	document.getElementById('setupScreen').classList.remove('hidden');
	document.getElementById('gameOver').classList.add('hidden');
	resetScores();
}

function restartGame() {
	document.getElementById('gameOver').classList.add('hidden');
	resetScores();
	resetGame();
	gameState = 'playing';
	gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
	gameData.keys[e.code] = true;
	if (e.code === 'Escape' && gameState === 'playing') {
		returnToSetup();
	}
	// Prevent arrow keys from scrolling the page
	if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
		e.preventDefault();
	}
});

document.addEventListener('keyup', (e) => {
	gameData.keys[e.code] = false;
});

// Settings event listeners
document.getElementById('ballSpeed').addEventListener('input', updateSettings);
document.getElementById('paddleScale').addEventListener('input', updateSettings);
document.getElementById('winScore').addEventListener('input', updateSettings);
document.getElementById('speedIncrease').addEventListener('change', updateSettings);
document.getElementById('aiDifficulty').addEventListener('input', updateSettings);

// Add direct color update events for more responsive logo updates
document.getElementById('player1Color').addEventListener('input', function() {
    gameSettings.player1Color = this.value;
    updateGridDisplay(); // This updates the CSS variables
});
document.getElementById('player2Color').addEventListener('input', function() {
    gameSettings.player2Color = this.value;
    updateGridDisplay(); // This updates the CSS variables
});

// Initialize the game
initializePaddleGrids();
updateSettings();

// Adding AI functions directly to the main script

/**
 * Handles AI player movement based on current game state
 */
function calculateAIMovement(ball, aiPlayer, aiState, difficulty, paddleSize, speed) {
    // AI state tracking
    aiState.timeSinceLastMove++;

    // Scale difficulty parameters (0.0-1.0)
    const difficultyScale = difficulty / 10;
    const reactionSpeed = 0.3 + (difficultyScale * 0.7); // 0.3 to 1.0
    const accuracy = 0.3 + (difficultyScale * 0.7); // 0.3 to 1.0
    const aggressiveness = 0.2 + (difficultyScale * 0.6); // 0.2 to 0.8
    
    // Determine AI strategy based on ball position and difficulty
    let targetX = aiPlayer.x;
    let targetY = aiPlayer.y;
    
    if (ball.vx > 0) { // Ball coming towards AI
        // Predict where ball will be
        const timeToReach = (aiPlayer.x - ball.x) / Math.abs(ball.vx);
        const predictedY = ball.y + (ball.vy * timeToReach);
        
        // Center paddle on predicted position with some error
        const errorMargin = (1 - accuracy) * 60; // Max 60px error on easiest
        const yError = (Math.random() - 0.5) * errorMargin;
        targetY = predictedY - paddleSize / 2 + yError;
        
        // Occasionally be more aggressive and move towards center
        if (Math.random() < aggressiveness && aiState.timeSinceLastMove > 30) {
            const centerDistance = Math.abs(aiPlayer.x - 750); // Distance from right-center of AI area
            if (centerDistance > 50) {
                targetX = aiPlayer.x - 20; // Move towards center
            }
            aiState.timeSinceLastMove = 0;
        }
    } else { // Ball going away from AI
        // Be more adventurous - move around the play area
        if (Math.random() < aggressiveness * 0.3 && aiState.timeSinceLastMove > 60) {
            // Randomly choose a new position to move to
            const minX = 620; // Start of AI area + some buffer
            const maxX = 870; // End of AI area - paddle width
            const minY = 50;
            const maxY = 400;
            
            aiState.target.x = minX + Math.random() * (maxX - minX);
            aiState.target.y = minY + Math.random() * (maxY - minY);
            aiState.timeSinceLastMove = 0;
        }
        
        // Move towards the target position
        targetX = aiState.target.x;
        targetY = aiState.target.y;
    }
    
    // Calculate movement with reaction speed
    const deltaX = targetX - aiPlayer.x;
    const deltaY = targetY - aiPlayer.y;
    
    let vx = 0;
    let vy = 0;
    
    // Apply movement with reaction speed limitation
    if (Math.abs(deltaX) > 5) {
        vx = Math.sign(deltaX) * speed * reactionSpeed;
    }
    if (Math.abs(deltaY) > 5) {
        vy = Math.sign(deltaY) * speed * reactionSpeed;
    }
    
    // Add some randomness to movement for lower difficulties
    if (difficultyScale < 0.7 && Math.random() < 0.05) {
        vx += (Math.random() - 0.5) * speed * 0.3;
        vy += (Math.random() - 0.5) * speed * 0.3;
    }

    return { vx, vy };
}

/**
 * Gets text description for AI difficulty level
 */
function getAIDifficultyName(difficultyLevel) {
    const difficultyNames = [
        '', 
        'Very Easy', 
        'Easy', 
        'Easy-Medium', 
        'Medium', 
        'Normal', 
        'Medium-Hard', 
        'Hard', 
        'Very Hard', 
        'Expert', 
        'Impossible'
    ];
    return difficultyNames[difficultyLevel] || 'Custom';
}
