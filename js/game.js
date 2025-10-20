
// Menu overlay logic with pausing
// Import AI module functions (ES module). ai.js exports calculateAIMovement and getAIDifficultyName.
import { calculateAIMovement, getAIDifficultyName } from './ai.js';
let isPaused = false;
function showMenuOverlay() {
	document.getElementById('pauseMenu').classList.remove('hidden');
	if (gameState === 'playing' && !isPaused) {
		pauseGame();
	}
}
function hideMenuOverlay() {
	document.getElementById('pauseMenu').classList.add('hidden');
	if (isPaused) {
		resumeGame();
	}
}

function pauseGame() {
	isPaused = true;
}

function resumeGame() {
	if (isPaused) {
		isPaused = false;
		lastTime = performance.now();
		requestAnimationFrame(gameLoop);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const resumeBtn = document.getElementById('resumeBtn');
	const returnBtn = document.getElementById('returnBtn');
	if (resumeBtn) resumeBtn.addEventListener('click', () => { hideMenuOverlay(); });
	if (returnBtn) returnBtn.addEventListener('click', () => { hideMenuOverlay(); returnToSetup(); });

	// Initialize the game only after DOM is ready
	initializePaddleGrids();
	updateSettings();

	// Wire preset and clear buttons (use data attributes set in index.html)
	const presetButtons = document.querySelectorAll('button[data-preset]');
	presetButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			const preset = btn.dataset.preset;
			const player = parseInt(btn.dataset.player, 10) || 1;
			loadPreset(preset, player);
		});
	});

	const actionButtons = document.querySelectorAll('button[data-action]');
	actionButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			const action = btn.dataset.action;
			const player = parseInt(btn.dataset.player, 10) || 1;
			if (action === 'clear') clearGrid(player);
		});
	});

	// Wire start and settings buttons
	const start1Btn = document.getElementById('start1Btn');
	const start2Btn = document.getElementById('start2Btn');
	if (start1Btn) start1Btn.addEventListener('click', () => startGame(false));
	if (start2Btn) start2Btn.addEventListener('click', () => startGame(true));

	const settingsHeader = document.getElementById('settingsHeader');
	if (settingsHeader) settingsHeader.addEventListener('click', toggleSettings);

	// Wire game over screen buttons
	const gameReturnBtn = document.getElementById('gameReturnBtn');
	const gameRestartBtn = document.getElementById('gameRestartBtn');
	if (gameReturnBtn) gameReturnBtn.addEventListener('click', returnToSetup);
	if (gameRestartBtn) gameRestartBtn.addEventListener('click', restartGame);

	// Event listeners
	document.addEventListener('keydown', (e) => {
		gameData.keys[e.code] = true;
		if (e.code === 'Escape') {
			const menu = document.getElementById('pauseMenu');
			if (menu && !menu.classList.contains('hidden')) {
				hideMenuOverlay();
			} else {
				showMenuOverlay();
			}
		}
		// Prevent arrow keys from scrolling the page
		if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
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
	document.getElementById('player1Color').addEventListener('input', function () {
		gameSettings.player1Color = this.value;
		updateGridDisplay(); // This updates the CSS variables
	});
	document.getElementById('player2Color').addEventListener('input', function () {
		gameSettings.player2Color = this.value;
		updateGridDisplay(); // This updates the CSS variables
	});
});
// Toast notification utility
function showToast(message, duration = 2500) {
	const toast = document.getElementById('toast');
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add('show');
	clearTimeout(showToast._timeout);
	showToast._timeout = setTimeout(() => {
		toast.classList.remove('show');
	}, duration);
}


// Matter.js setup
const Matter = window.Matter;
const { Engine, World, Bodies, Body, Composite, Vector, Events } = Matter;

// Game state
let gameState = 'setup';
let twoPlayerMode = false;
let paddleData1 = [];
let paddleData2 = [];
let gameSettings = {
	ballSpeed: 4,
	paddleScale: 5, // 5 is now the default (1x)
	winScore: 7,
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

// Matter.js variables
let engine;
let ballBody;
let player1Bodies = [];
let player2Bodies = [];
let lastTime = 0;

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
				const xPos = x * pixelSize - (gridCenter * pixelSize - 30 / 2);
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
				const xPos = (15 - x) * pixelSize - (gridCenter * pixelSize - 30 / 2);
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
	// Slider value: 0.5-3, but actual scale: value * 5
	const sliderValue = parseFloat(document.getElementById('paddleScale').value);
	gameSettings.paddleScale = sliderValue * 5;
	gameSettings.winScore = parseInt(document.getElementById('winScore').value);
	gameSettings.speedIncrease = document.getElementById('speedIncrease').checked;
	gameSettings.aiDifficulty = parseInt(document.getElementById('aiDifficulty').value);
	gameSettings.player1Color = document.getElementById('player1Color').value;
	gameSettings.player2Color = document.getElementById('player2Color').value;
	document.getElementById('ballSpeedValue').textContent = gameSettings.ballSpeed;
	document.getElementById('paddleScaleValue').textContent = sliderValue + 'x';
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
		showToast('Please design both paddles first!');
		return;
	}
	updateSettings();
	twoPlayerMode = twoPlayer;
	gameState = 'playing';
	document.getElementById('setupScreen').classList.add('hidden');
	document.getElementById('gameContainer').classList.remove('hidden');
	document.getElementById('targetScore').textContent = gameSettings.winScore;
	resetScores();
	resetGame();
	// Initialize timing and start the animation loop via requestAnimationFrame
	lastTime = performance.now();
	requestAnimationFrame(gameLoop);
}

function resetGame() {
	// Matter.js engine and objects setup
	engine = Engine.create();
	engine.world.gravity.y = 0;
	engine.positionIterations = 12;
	engine.constraintIterations = 12;

	// Ball radius
	const ballRadius = gameData.ball.size / 2;
	const canvasWidth = 900;
	const canvasHeight = 500;
	const topWall = Bodies.rectangle(canvasWidth / 2, 0 - gameData.ball.size / 2, canvasWidth, gameData.ball.size, {
		isStatic: true,
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0
	});
	const bottomWall = Bodies.rectangle(canvasWidth / 2, canvasHeight + gameData.ball.size / 2, canvasWidth, gameData.ball.size, {
		isStatic: true,
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0
	});
	World.add(engine.world, [topWall, bottomWall]);

	// Create ball
	ballBody = Bodies.circle(450, 250, ballRadius, {
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0
	});
	World.add(engine.world, ballBody);

	// Create paddle bodies
	const paddleBodyOptions = {
		isStatic: false,
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0,
		mass: 1000
	};
	player1Bodies = [];
	for (let py = 0; py < 16; py++) {
		for (let px = 0; px < 16; px++) {
			if (paddleData1[py][px]) {
				const x = gameData.player1.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const y = gameData.player1.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const rect = Bodies.rectangle(x, y, gameSettings.paddleScale, gameSettings.paddleScale, paddleBodyOptions);
				player1Bodies.push(rect);
				World.add(engine.world, rect);
			}
		}
	}
	player2Bodies = [];
	for (let py = 0; py < 16; py++) {
		for (let px = 0; px < 16; px++) {
			if (paddleData2[py][px]) {
				const x = gameData.player2.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const y = gameData.player2.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const rect = Bodies.rectangle(x, y, gameSettings.paddleScale, gameSettings.paddleScale, paddleBodyOptions);
				player2Bodies.push(rect);
				World.add(engine.world, rect);
			}
		}
	}

	// Add collision event for rallies
	Events.on(engine, 'collisionStart', (event) => {
		event.pairs.forEach(pair => {
			const bodies = [pair.bodyA, pair.bodyB];
			if (bodies.includes(ballBody)) {
				const other = bodies.find(b => b !== ballBody);
				if (player1Bodies.includes(other) || player2Bodies.includes(other)) {
					gameData.rallies++;
					if (gameSettings.speedIncrease && gameData.rallies % 5 === 0) {
						const speed = Vector.magnitude(ballBody.velocity);
						const newSpeed = Math.min(speed + 0.1 * gameData.ball.baseSpeed, gameData.ball.baseSpeed * 2.5);
						Body.setVelocity(ballBody, Vector.mult(Vector.normalise(ballBody.velocity), newSpeed));
						updateSpeedDisplay();
					}
				}
			}
		});
	});

	// Reset game state
	// Always use the latest ball speed from gameSettings
	const baseSpeed = parseFloat(document.getElementById('ballSpeed').value);
	gameSettings.ballSpeed = baseSpeed;
	gameData.player1 = { x: 50, y: 200, vx: 0, vy: 0, score: 0 };
	gameData.player2 = { x: 650, y: 200, vx: 0, vy: 0, score: 0 };
	gameData.speedMultiplier = 1;
	gameData.rallies = 0;
	gameData.aiState = {
		target: { x: 650, y: 200 },
		lastBallX: 0,
		aggressiveness: 0.5,
		timeSinceLastMove: 0
	};
	Body.setPosition(ballBody, { x: 450, y: 250 });
	let vx = Math.random() > 0.5 ? baseSpeed : -baseSpeed;
	let vy = (Math.random() - 0.5) * baseSpeed;
	Body.setVelocity(ballBody, { x: vx, y: vy });
	updateSpeedDisplay();
	updateModeDisplay();
}

// Update mode display on game start

function resetScores() {
	gameData.player1.score = 0;
	gameData.player2.score = 0;
	updateScoreDisplay();
	// Also update the scorebug display immediately
	document.getElementById('score1').textContent = '0';
	document.getElementById('score2').textContent = '0';
}

function updateScoreDisplay() {
	document.getElementById('score1').textContent = gameData.player1.score;
	document.getElementById('score2').textContent = gameData.player2.score;
}

function updateModeDisplay() {
	const modeIcon = document.getElementById('gameModeIcon');
	const modeText = document.getElementById('gameModeText');
	if (!modeIcon || !modeText) return;
	if (twoPlayerMode) {
		modeIcon.className = 'mode-icon two-player';
		modeText.textContent = '2 Player Mode';
		document.getElementById('scorebugName1').textContent = 'P1';
		document.getElementById('scorebugName2').textContent = 'P2';
	} else {
		modeIcon.className = 'mode-icon one-player';
		modeText.textContent = '1 Player vs AI';
		document.getElementById('scorebugName1').textContent = 'You';
		document.getElementById('scorebugName2').textContent = 'AI';
	}
}

function updateSpeedDisplay() {
	// Use the actual ball speed from gameSettings
	const currentSpeed = gameSettings.ballSpeed * gameData.speedMultiplier;
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
			speed,
			paddleData2 // Pass paddle shape to AI
		);
		// Apply AI calculated movement
		gameData.player2.vx = aiMovement.vx;
		gameData.player2.vy = aiMovement.vy;
	}
}

function updatePaddles() {
	const paddleSize = 16 * gameSettings.paddleScale;
	const canvasWidth = 900;
	const canvasHeight = 500;
	const sectionWidth = canvasWidth / 3; // 300px per section

	// Helper to check if a paddle's active pixels would be out of bounds or inside the fence
	function isPaddlePositionValid(x, y, playerNum) {
		const paddleData = playerNum === 1 ? paddleData1 : paddleData2;
		for (let py = 0; py < 16; py++) {
			for (let px = 0; px < 16; px++) {
				if (!paddleData[py][px]) continue;
				const pixelX = x + px * gameSettings.paddleScale;
				const pixelY = y + py * gameSettings.paddleScale;
				// Top/bottom wall check (no margin)
				if (pixelY < 0 || pixelY + gameSettings.paddleScale > canvasHeight) return false;
				// Left/right wall check (keep margin for left/right)
				if (pixelX < 10 || pixelX + gameSettings.paddleScale > canvasWidth - 10) return false;
				// Center fence check (block if any part touches or crosses the fence)
				if (playerNum === 1) {
					// Player 1: right edge of pixel must be < 300 (cannot touch or cross 300)
					if (pixelX + gameSettings.paddleScale > 300) return false;
				} else {
					// Player 2: left edge of pixel must be >= 600 (cannot touch or cross 600)
					if (pixelX < 600) return false;
				}
			}
		}
		return true;
	}

	// --- Player 1 (left) ---
	let tryX1 = gameData.player1.x + gameData.player1.vx;
	let tryY1 = gameData.player1.y + gameData.player1.vy;
	// Only allow move if all active pixels remain on correct side of fence and in bounds
	let validMove1 = true;
	for (let py = 0; py < 16 && validMove1; py++) {
		for (let px = 0; px < 16 && validMove1; px++) {
			if (!paddleData1[py][px]) continue;
			let pixelX = tryX1 + px * gameSettings.paddleScale;
			let pixelY = tryY1 + py * gameSettings.paddleScale;
			if (pixelX + gameSettings.paddleScale >= 300 || pixelX < 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
				validMove1 = false;
			}
		}
	}
	if (validMove1) {
		gameData.player1.x = tryX1;
		gameData.player1.y = tryY1;
	} else {
		// Try moving only in x
		let tryX1x = gameData.player1.x + gameData.player1.vx;
		let tryY1x = gameData.player1.y;
		let validMove1x = true;
		for (let py = 0; py < 16 && validMove1x; py++) {
			for (let px = 0; px < 16 && validMove1x; px++) {
				if (!paddleData1[py][px]) continue;
				let pixelX = tryX1x + px * gameSettings.paddleScale;
				let pixelY = tryY1x + py * gameSettings.paddleScale;
				if (pixelX + gameSettings.paddleScale >= 300 || pixelX < 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
					validMove1x = false;
				}
			}
		}
		if (validMove1x) gameData.player1.x = tryX1x;
		// Try moving only in y
		let tryX1y = gameData.player1.x;
		let tryY1y = gameData.player1.y + gameData.player1.vy;
		let validMove1y = true;
		for (let py = 0; py < 16 && validMove1y; py++) {
			for (let px = 0; px < 16 && validMove1y; px++) {
				if (!paddleData1[py][px]) continue;
				let pixelX = tryX1y + px * gameSettings.paddleScale;
				let pixelY = tryY1y + py * gameSettings.paddleScale;
				if (pixelX + gameSettings.paddleScale >= 300 || pixelX < 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
					validMove1y = false;
				}
			}
		}
		if (validMove1y) gameData.player1.y = tryY1y;
	}

	// --- Player 2 (right) ---
	let tryX2 = gameData.player2.x + gameData.player2.vx;
	let tryY2 = gameData.player2.y + gameData.player2.vy;
	let validMove2 = true;
	for (let py = 0; py < 16 && validMove2; py++) {
		for (let px = 0; px < 16 && validMove2; px++) {
			if (!paddleData2[py][px]) continue;
			let pixelX = tryX2 + px * gameSettings.paddleScale;
			let pixelY = tryY2 + py * gameSettings.paddleScale;
			if (pixelX < 600 || pixelX + gameSettings.paddleScale > 900 - 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
				validMove2 = false;
			}
		}
	}
	if (validMove2) {
		gameData.player2.x = tryX2;
		gameData.player2.y = tryY2;
	} else {
		// Try moving only in x
		let tryX2x = gameData.player2.x + gameData.player2.vx;
		let tryY2x = gameData.player2.y;
		let validMove2x = true;
		for (let py = 0; py < 16 && validMove2x; py++) {
			for (let px = 0; px < 16 && validMove2x; px++) {
				if (!paddleData2[py][px]) continue;
				let pixelX = tryX2x + px * gameSettings.paddleScale;
				let pixelY = tryY2x + py * gameSettings.paddleScale;
				if (pixelX < 600 || pixelX + gameSettings.paddleScale > 900 - 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
					validMove2x = false;
				}
			}
		}
		if (validMove2x) gameData.player2.x = tryX2x;
		// Try moving only in y
		let tryX2y = gameData.player2.x;
		let tryY2y = gameData.player2.y + gameData.player2.vy;
		let validMove2y = true;
		for (let py = 0; py < 16 && validMove2y; py++) {
			for (let px = 0; px < 16 && validMove2y; px++) {
				if (!paddleData2[py][px]) continue;
				let pixelX = tryX2y + px * gameSettings.paddleScale;
				let pixelY = tryY2y + py * gameSettings.paddleScale;
				if (pixelX < 600 || pixelX + gameSettings.paddleScale > 900 - 10 || pixelY < 0 || pixelY + gameSettings.paddleScale > 500) {
					validMove2y = false;
				}
			}
		}
		if (validMove2y) gameData.player2.y = tryY2y;
	}

	// Update Matter.js paddle body positions and velocities
	let bodyIndex1 = 0;
	for (let py = 0; py < 16; py++) {
		for (let px = 0; px < 16; px++) {
			if (paddleData1[py][px]) {
				const x = gameData.player1.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const y = gameData.player1.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				Body.setPosition(player1Bodies[bodyIndex1], { x, y });
				Body.setVelocity(player1Bodies[bodyIndex1], { x: gameData.player1.vx, y: gameData.player1.vy });
				bodyIndex1++;
			}
		}
	}
	let bodyIndex2 = 0;
	for (let py = 0; py < 16; py++) {
		for (let px = 0; px < 16; px++) {
			if (paddleData2[py][px]) {
				const x = gameData.player2.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				const y = gameData.player2.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
				Body.setPosition(player2Bodies[bodyIndex2], { x, y });
				Body.setVelocity(player2Bodies[bodyIndex2], { x: gameData.player2.vx, y: gameData.player2.vy });
				bodyIndex2++;
			}
		}
	}
}



function updateBall() {
	// Sync gameData.ball from Matter.js ballBody
	// Use the center position for both x and y
	gameData.ball.x = ballBody.position.x;
	gameData.ball.y = ballBody.position.y;
	gameData.ball.vx = ballBody.velocity.x;
	gameData.ball.vy = ballBody.velocity.y;

	// Prevent ball from freezing (minimum velocity)
	const minSpeed = 1.5;
	const velocity = Matter.Vector.magnitude(ballBody.velocity);
	if (velocity < minSpeed) {
		// Nudge ball along current direction
		let vx = ballBody.velocity.x;
		let vy = ballBody.velocity.y;
		if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
			// If nearly stopped, pick a random direction
			const angle = Math.random() * 2 * Math.PI;
			vx = Math.cos(angle);
			vy = Math.sin(angle);
		}
		const norm = Matter.Vector.normalise({ x: vx, y: vy });
		Matter.Body.setVelocity(ballBody, {
			x: norm.x * minSpeed,
			y: norm.y * minSpeed
		});
	}

	// Check for scoring
	// Ball is out of bounds if its center is past the left or right edge
	if (ballBody.position.x < 0) {
		gameData.player2.score++;
		updateScoreDisplay();
		if (!checkGameEnd()) {
			resetBallAndPaddles();
		}
	} else if (ballBody.position.x > 900) {
		gameData.player1.score++;
		updateScoreDisplay();
		if (!checkGameEnd()) {
			resetBallAndPaddles();
		}
	}
	// Only called after a score
	function resetBallAndPaddles() {
		// Reset ball position and velocity
		Body.setPosition(ballBody, { x: 450, y: 250 });
		let baseSpeed = gameSettings.ballSpeed;
		let vx = Math.random() > 0.5 ? baseSpeed : -baseSpeed;
		let vy = (Math.random() - 0.5) * baseSpeed;
		Body.setVelocity(ballBody, { x: vx, y: vy });
		// Reset player positions
		gameData.player1.x = 50;
		gameData.player1.y = 200;
		gameData.player2.x = 650;
		gameData.player2.y = 200;
		// Also update paddle bodies
		let bodyIndex1 = 0;
		for (let py = 0; py < 16; py++) {
			for (let px = 0; px < 16; px++) {
				if (paddleData1[py][px]) {
					const x = gameData.player1.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
					const y = gameData.player1.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
					Body.setPosition(player1Bodies[bodyIndex1], { x, y });
					Body.setVelocity(player1Bodies[bodyIndex1], { x: 0, y: 0 });
					bodyIndex1++;
				}
			}
		}
		let bodyIndex2 = 0;
		for (let py = 0; py < 16; py++) {
			for (let px = 0; px < 16; px++) {
				if (paddleData2[py][px]) {
					const x = gameData.player2.x + px * gameSettings.paddleScale + gameSettings.paddleScale / 2;
					const y = gameData.player2.y + py * gameSettings.paddleScale + gameSettings.paddleScale / 2;
					Body.setPosition(player2Bodies[bodyIndex2], { x, y });
					Body.setVelocity(player2Bodies[bodyIndex2], { x: 0, y: 0 });
					bodyIndex2++;
				}
			}
		}
		// Reset other game state
		gameData.speedMultiplier = 1;
		gameData.rallies = 0;
		gameData.aiState = {
			target: { x: 650, y: 200 },
			lastBallX: 0,
			aggressiveness: 0.5,
			timeSinceLastMove: 0
		};
		updateSpeedDisplay();
		updateModeDisplay();
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
		return true;
	}
	return false;
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

	// Removed gray rectangles for top and bottom walls

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
	ctx.arc(ballBody.position.x, ballBody.position.y, gameData.ball.size / 2, 0, 2 * Math.PI);
	ctx.fill();
}

function gameLoop(currentTime = 0) {
	if (gameState !== 'playing') return;
	if (isPaused) return; // Suspend updates while paused
	const deltaTime = currentTime - lastTime;
	lastTime = currentTime;
	handleInput();
	updatePaddles();
	// Update Matter.js physics
	Engine.update(engine, deltaTime);
	updateBall();
	render();
	requestAnimationFrame(gameLoop);
}

function returnToSetup() {
	gameState = 'setup';
	document.getElementById('gameContainer').classList.add('hidden');
	document.getElementById('setupScreen').classList.remove('hidden');
	document.getElementById('gameOver').classList.add('hidden');
	// Always reset scores and ball state when returning to setup
	resetScores();
}

function restartGame() {
	document.getElementById('gameOver').classList.add('hidden');
	resetScores();
	resetGame();
	gameState = 'playing';
	// Ensure timing is initialized and start the loop using requestAnimationFrame
	lastTime = performance.now();
	requestAnimationFrame(gameLoop);
}


