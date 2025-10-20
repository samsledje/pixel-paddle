/**
 * Elite AI Module for PixelPaddle v2.1
 *
 * Bug fixes:
 * - Fixed slow ball chase (AI no longer moves away from slow balls in its zone)
 * - Fixed diagonal paddle shapes (accounts for paddle width at intercept Y)
 * - Improved spatial awareness for all paddle geometries
 */

// Game constants
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const PLAYER2_ZONE = { left: 600, right: 890, top: 0, bottom: 500 };
const BALL_RADIUS = 6;

/**
 * Predicts ball trajectory with accurate multi-bounce physics
 */
function predictBallTrajectory(ball, targetX = 600, maxBounces = 10) {
    if (ball.vx <= 0) {
        return null; // Ball moving away
    }

    let x = ball.x;
    let y = ball.y;
    let vx = ball.vx;
    let vy = ball.vy;
    let time = 0;
    let bounces = 0;
    const dt = 0.1;
    const maxTime = 500;

    // Simulate ball movement
    while (x < targetX && time < maxTime && bounces <= maxBounces) {
        x += vx * dt;
        y += vy * dt;
        time += dt;

        // Check for wall bounces
        if (y <= BALL_RADIUS || y >= CANVAS_HEIGHT - BALL_RADIUS) {
            vy = -vy;
            y = Math.max(BALL_RADIUS, Math.min(CANVAS_HEIGHT - BALL_RADIUS, y));
            bounces++;
        }
    }

    if (x >= targetX && time < maxTime) {
        return {
            y: y,
            time: time,
            bounces: bounces,
            finalVx: vx,
            finalVy: vy,
            confidence: Math.max(0.3, 1.0 - bounces * 0.15)
        };
    }

    return null;
}

/**
 * Enhanced paddle shape analysis with width-at-height mapping
 * CRITICAL: Now tracks paddle width at each Y position for diagonal shapes
 */
function analyzePaddleShape(paddleData, paddleScale) {
    const activePixels = [];
    let totalX = 0, totalY = 0, count = 0;

    // Build map of width at each Y position
    const widthAtY = new Array(16).fill(0);
    const leftmostAtY = new Array(16).fill(16);
    const rightmostAtY = new Array(16).fill(0);

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (paddleData[y][x]) {
                activePixels.push({ x, y });
                totalX += x;
                totalY += y;
                count++;

                // Track width at this Y
                widthAtY[y]++;
                leftmostAtY[y] = Math.min(leftmostAtY[y], x);
                rightmostAtY[y] = Math.max(rightmostAtY[y], x);
            }
        }
    }

    if (count === 0) {
        return {
            centerX: 8, centerY: 8,
            topY: 0, bottomY: 15,
            leftmostX: 0, rightmostX: 15,
            widthAtY: new Array(16).fill(16),
            leftmostAtY: new Array(16).fill(0),
            rightmostAtY: new Array(16).fill(15),
            topEdge: [], bottomEdge: [], leftEdge: [], rightEdge: [],
            activePixels: []
        };
    }

    const centerX = totalX / count;
    const centerY = totalY / count;
    const minY = Math.min(...activePixels.map(p => p.y));
    const maxY = Math.max(...activePixels.map(p => p.y));
    const minX = Math.min(...activePixels.map(p => p.x));
    const maxX = Math.max(...activePixels.map(p => p.x));

    // Find edge pixels
    const topEdge = activePixels.filter(p => p.y === minY);
    const bottomEdge = activePixels.filter(p => p.y === maxY);
    const leftEdge = activePixels.filter(p => p.x === minX);
    const rightEdge = activePixels.filter(p => p.x === maxX);

    return {
        centerX, centerY,
        topY: minY, bottomY: maxY,
        leftmostX: minX, rightmostX: maxX,
        height: (maxY - minY + 1) * paddleScale,
        width: (maxX - minX + 1) * paddleScale,
        widthAtY,           // NEW: Width at each Y position
        leftmostAtY,        // NEW: Leftmost pixel at each Y
        rightmostAtY,       // NEW: Rightmost pixel at each Y
        topEdge, bottomEdge, leftEdge, rightEdge,
        activePixels
    };
}

/**
 * Calculates the effective X offset needed to center paddle at given Y
 * CRITICAL FIX: Accounts for varying paddle width at different Y positions
 */
function calculatePaddleOffsetForY(paddleShape, targetPixelY, paddleScale) {
    // Clamp to valid Y range
    const clampedY = Math.max(0, Math.min(15, Math.round(targetPixelY)));

    // Get width at this Y position
    const width = paddleShape.widthAtY[clampedY];

    if (width === 0) {
        // No pixels at this Y - use center
        return paddleShape.centerX * paddleScale;
    }

    // Calculate center of pixels at this Y
    const leftmost = paddleShape.leftmostAtY[clampedY];
    const rightmost = paddleShape.rightmostAtY[clampedY];
    const centerAtY = (leftmost + rightmost) / 2;

    return centerAtY * paddleScale;
}

/**
 * Calculates optimal paddle velocity for strategic ball returns
 */
function calculateVelocityStrategy(ball, paddle, targetPosition, strategy) {
    const dx = targetPosition.x - paddle.x;
    const dy = targetPosition.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
        // At position - now optimize impact velocity
        if (strategy === 'aggressive' || strategy.includes('smash')) {
            return {
                vx: ball.vx > 0 ? -4 : 4,
                vy: 0,
                reason: 'power_hit'
            };
        } else if (strategy === 'absorb') {
            return {
                vx: ball.vx > 0 ? 2 : -2,
                vy: ball.vy > 0 ? 2 : -2,
                reason: 'soft_return'
            };
        }
    }

    return null;
}

/**
 * Analyzes opponent's position and likely return angles
 */
function analyzeOpponentThreat(ball, prediction) {
    if (!prediction) return { threat: 'none', expectedReturnY: 250 };

    const threatLevel = prediction.confidence * (1 / Math.max(1, prediction.time / 50));

    let expectedReturnY = 250;

    if (Math.abs(ball.vy) > Math.abs(ball.vx) * 0.5) {
        expectedReturnY = prediction.y;
    } else {
        expectedReturnY = 250;
    }

    return {
        threat: threatLevel > 0.8 ? 'high' : threatLevel > 0.5 ? 'medium' : 'low',
        expectedReturnY: expectedReturnY,
        threatLevel: threatLevel
    };
}

/**
 * Enhanced interception strategy with width-aware positioning
 */
function calculateInterceptionStrategy(ball, paddle, paddleShape, paddleScale) {
    const prediction = predictBallTrajectory(ball, PLAYER2_ZONE.left);

    if (!prediction) {
        // Defensive positioning
        const opponentThreat = analyzeOpponentThreat(ball, null);
        return {
            targetX: 650,
            targetY: Math.max(50, Math.min(450, opponentThreat.expectedReturnY)),
            strategy: 'defensive',
            urgency: 0.3,
            velocityStrategy: null
        };
    }

    // CRITICAL FIX: Calculate target Y considering paddle width at that position
    const predictedPixelY = prediction.y / paddleScale;
    const xOffsetForY = calculatePaddleOffsetForY(paddleShape, predictedPixelY, paddleScale);

    // Target Y is the predicted ball Y minus the offset to center paddle at that Y
    let targetPaddleY = prediction.y - xOffsetForY;
    let targetPaddleX = paddle.x;
    let strategy = 'intercept';
    let urgency = Math.min(1.0, 5.0 / Math.max(1, prediction.time));

    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    // Strategic shot selection
    if (prediction.confidence > 0.7 && ballSpeed < 6) {
        if (prediction.y < 150) {
            // Hit with top edge
            const topPixelY = paddleShape.topY;
            const xOffsetTop = calculatePaddleOffsetForY(paddleShape, topPixelY, paddleScale);
            targetPaddleY = prediction.y - xOffsetTop;
            strategy = 'smash_down';
        } else if (prediction.y > 350) {
            // Hit with bottom edge
            const bottomPixelY = paddleShape.bottomY;
            const xOffsetBottom = calculatePaddleOffsetForY(paddleShape, bottomPixelY, paddleScale);
            targetPaddleY = prediction.y - xOffsetBottom;
            strategy = 'smash_up';
        } else {
            strategy = 'aim_corner';
        }
    } else if (ballSpeed > 8) {
        // Fast ball - use widest part of paddle
        const widestY = paddleShape.widthAtY.indexOf(Math.max(...paddleShape.widthAtY));
        const xOffsetWidest = calculatePaddleOffsetForY(paddleShape, widestY, paddleScale);
        targetPaddleY = prediction.y - xOffsetWidest;
        strategy = 'defensive_block';
    } else if (Math.abs(ball.vy) > Math.abs(ball.vx)) {
        // Counter spin
        if (ball.vy > 0) {
            const bottomPixelY = paddleShape.bottomY;
            const xOffsetBottom = calculatePaddleOffsetForY(paddleShape, bottomPixelY, paddleScale);
            targetPaddleY = prediction.y - xOffsetBottom;
            strategy = 'counter_spin_down';
        } else {
            const topPixelY = paddleShape.topY;
            const xOffsetTop = calculatePaddleOffsetForY(paddleShape, topPixelY, paddleScale);
            targetPaddleY = prediction.y - xOffsetTop;
            strategy = 'counter_spin_up';
        }
    }

    // Aggressive positioning
    if (prediction.time > 60 && ball.x < 500 && prediction.confidence > 0.6) {
        targetPaddleX = Math.max(PLAYER2_ZONE.left, paddle.x - 10);
        strategy = 'aggressive';
        urgency = 0.85;
    }

    let velocityStrategy = null;
    if (strategy.includes('smash')) {
        velocityStrategy = 'power_hit';
    } else if (strategy === 'defensive_block') {
        velocityStrategy = 'absorb';
    }

    return {
        targetX: targetPaddleX,
        targetY: targetPaddleY,
        strategy,
        urgency,
        prediction,
        velocityStrategy
    };
}

/**
 * CRITICAL FIX: Enhanced chase logic that handles balls in AI zone
 */
function checkChaseOpportunity(ball, paddle, paddleShape, paddleScale) {
    const paddleRight = paddle.x + 16 * paddleScale;
    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    // FIX: Expand chase detection to include balls in AI zone moving slowly
    const isBallInZone = ball.x >= PLAYER2_ZONE.left && ball.x <= PLAYER2_ZONE.right;
    const isBallBehind = ball.x > paddleRight + 10;
    const isBallSlow = ballSpeed < 4.5;
    const isBallApproachable = ball.x < PLAYER2_ZONE.right - 20;

    // NEW: If ball is in our zone and slow, we should chase it even if not "behind"
    const shouldChase = isBallSlow && isBallApproachable && (isBallBehind ||
        (isBallInZone && ball.vx < 3 && ball.vx > 0));

    if (shouldChase) {
        // Predict where ball will be
        const paddleSpeed = 4;
        const paddleCenterX = paddle.x + 8 * paddleScale;
        const paddleCenterY = paddle.y + 8 * paddleScale;

        const distanceToBall = Math.sqrt(
            Math.pow(ball.x - paddleCenterX, 2) +
            Math.pow(ball.y - paddleCenterY, 2)
        );

        const timeToReach = distanceToBall / paddleSpeed;
        const ballFutureX = ball.x + ball.vx * timeToReach;
        const ballFutureY = ball.y + ball.vy * timeToReach;

        // Account for bounces during chase
        let futureY = ballFutureY;
        while (futureY < 0 || futureY > CANVAS_HEIGHT) {
            if (futureY < 0) futureY = -futureY;
            if (futureY > CANVAS_HEIGHT) futureY = 2 * CANVAS_HEIGHT - futureY;
        }

        const maxReachX = PLAYER2_ZONE.right - 16 * paddleScale - 5;

        if (ballFutureX < maxReachX && futureY > 0 && futureY < CANVAS_HEIGHT) {
            const targetX = Math.min(maxReachX, Math.max(PLAYER2_ZONE.left, ballFutureX - 8 * paddleScale));

            // Use width-aware positioning
            const predictedPixelY = futureY / paddleScale;
            const xOffsetForY = calculatePaddleOffsetForY(paddleShape, predictedPixelY, paddleScale);

            return {
                targetX: targetX,
                targetY: futureY - xOffsetForY,
                strategy: 'chase',
                urgency: 0.95
            };
        }
    }

    return null;
}

/**
 * Enhanced loop-around with spatial verification
 */
function checkLoopAroundOpportunity(ball, paddle, paddleShape, paddleScale) {
    const paddleWidth = 16 * paddleScale;
    const paddleRight = paddle.x + paddleWidth;

    // Ball must be behind and moving slowly
    if (ball.x <= paddleRight || ball.vx >= 3) {
        return null;
    }

    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    if (ballSpeed > 3.5) {
        return null;
    }

    // Calculate spatial constraints
    const maxReachX = PLAYER2_ZONE.right - paddleWidth - 5;
    const idealTargetX = Math.min(maxReachX, ball.x + 40);

    if (idealTargetX < PLAYER2_ZONE.left) {
        return null;
    }

    // Calculate timing
    const distanceToTarget = Math.abs(idealTargetX - paddle.x);
    const timeToTarget = distanceToTarget / 4;

    const distanceToWall = CANVAS_WIDTH - ball.x;
    const timeToWall = distanceToWall / Math.max(0.5, ball.vx);

    if (timeToTarget < timeToWall * 0.7) {
        // Use width-aware positioning
        const predictedPixelY = ball.y / paddleScale;
        const xOffsetForY = calculatePaddleOffsetForY(paddleShape, predictedPixelY, paddleScale);

        return {
            targetX: idealTargetX,
            targetY: ball.y - xOffsetForY,
            strategy: 'loop_around',
            urgency: 1.0
        };
    }

    return null;
}

/**
 * Advanced positioning that considers paddle shape geometry
 */
function optimizeContactPoint(prediction, paddleShape, paddleScale, strategy) {
    if (!prediction) return { offsetY: 0 };

    let targetPixelY = paddleShape.centerY;

    if (strategy.includes('smash_down')) {
        targetPixelY = paddleShape.topY + 1;
    } else if (strategy.includes('smash_up')) {
        targetPixelY = paddleShape.bottomY - 1;
    } else if (strategy.includes('counter_spin')) {
        if (prediction.finalVy > 0) {
            targetPixelY = paddleShape.bottomY;
        } else {
            targetPixelY = paddleShape.topY;
        }
    } else if (strategy === 'aim_corner') {
        if (prediction.y < 250) {
            targetPixelY = paddleShape.centerY + 2;
        } else {
            targetPixelY = paddleShape.centerY - 2;
        }
    }

    // Calculate offset considering width at target Y
    const xOffsetForY = calculatePaddleOffsetForY(paddleShape, targetPixelY, paddleScale);

    return {
        offsetY: xOffsetForY - paddleShape.centerX * paddleScale
    };
}

/**
 * Main AI calculation with all enhancements
 */
export function calculateAIMovement(ball, paddle, aiState, difficulty, paddleSize, maxSpeed, paddleData) {
    const paddleScale = paddleSize / 16;
    const paddleShape = analyzePaddleShape(paddleData, paddleScale);

    // Priority 1: Loop around opportunity
    const loopOpportunity = checkLoopAroundOpportunity(ball, paddle, paddleShape, paddleScale);
    if (loopOpportunity) {
        aiState.target = { x: loopOpportunity.targetX, y: loopOpportunity.targetY };
        aiState.strategy = loopOpportunity.strategy;
        aiState.urgency = loopOpportunity.urgency;
    }
    // Priority 2: Chase opportunity (NOW CATCHES SLOW BALLS IN ZONE!)
    else {
        const chaseOpportunity = checkChaseOpportunity(ball, paddle, paddleShape, paddleScale);
        if (chaseOpportunity) {
            aiState.target = { x: chaseOpportunity.targetX, y: chaseOpportunity.targetY };
            aiState.strategy = chaseOpportunity.strategy;
            aiState.urgency = chaseOpportunity.urgency;
        }
        // Priority 3: Standard interception
        else {
            const strategy = calculateInterceptionStrategy(ball, paddle, paddleShape, paddleScale);

            const contactOptimization = optimizeContactPoint(
                strategy.prediction,
                paddleShape,
                paddleScale,
                strategy.strategy
            );

            aiState.target = {
                x: strategy.targetX,
                y: strategy.targetY + contactOptimization.offsetY
            };
            aiState.strategy = strategy.strategy;
            aiState.urgency = strategy.urgency;
            aiState.velocityStrategy = strategy.velocityStrategy;
        }
    }

    // Calculate movement vector
    const dx = aiState.target.x - paddle.x;
    const dy = aiState.target.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // At target - check for velocity optimization
    if (distance < 3) {
        const velocityOpt = calculateVelocityStrategy(ball, paddle, aiState.target, aiState.strategy);
        if (velocityOpt) {
            return velocityOpt;
        }
        return { vx: 0, vy: 0 };
    }

    // Move toward target with urgency-based speed
    const dirX = dx / distance;
    const dirY = dy / distance;

    const speedMultiplier = aiState.urgency > 0.9 ? 1.0 :
        aiState.urgency > 0.7 ? 0.95 :
            aiState.urgency > 0.5 ? 0.9 : 0.85;

    const speed = maxSpeed * speedMultiplier;

    return {
        vx: dirX * speed,
        vy: dirY * speed
    };
}

/**
 * Difficulty name mapping
 */
export function getAIDifficultyName(difficulty) {
    if (difficulty <= 2) return 'Very Easy';
    if (difficulty <= 4) return 'Easy';
    if (difficulty <= 6) return 'Normal';
    if (difficulty <= 8) return 'Hard';
    return 'Expert';
}
