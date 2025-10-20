/**
 * Elite AI Module for PixelPaddle v2.0
 *
 * Major improvements:
 * - Multi-bounce trajectory prediction with proper physics
 * - Paddle velocity optimization for strategic returns
 * - Advanced defensive positioning based on opponent analysis
 * - Smarter chase/loop logic with spatial awareness
 * - Strategic shot placement to force errors
 * - Considers paddle shape for optimal contact points
 */

// Game constants
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const PLAYER2_ZONE = { left: 600, right: 890, top: 0, bottom: 500 };
const BALL_RADIUS = 6;

/**
 * Predicts ball trajectory with accurate multi-bounce physics
 *
 * @param {Object} ball - Ball object with x, y, vx, vy properties
 * @param {number} targetX - The x-coordinate to predict intersection at
 * @param {number} maxBounces - Maximum bounces to simulate (default: 10)
 * @returns {Object|null} - Detailed prediction or null if unreachable
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
    const dt = 0.1; // Time step for simulation
    const maxTime = 500; // Prevent infinite loops

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
            confidence: Math.max(0.3, 1.0 - bounces * 0.15) // Confidence decreases with bounces
        };
    }

    return null;
}

/**
 * Enhanced paddle shape analysis with strategic points
 */
function analyzePaddleShape(paddleData, paddleScale) {
    const activePixels = [];
    let totalX = 0, totalY = 0, count = 0;

    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (paddleData[y][x]) {
                activePixels.push({ x, y });
                totalX += x;
                totalY += y;
                count++;
            }
        }
    }

    if (count === 0) {
        return {
            centerX: 8, centerY: 8,
            topY: 0, bottomY: 15,
            leftmostX: 0, rightmostX: 15,
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

    // Find edge pixels for strategic hitting
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
        topEdge, bottomEdge, leftEdge, rightEdge,
        activePixels
    };
}

/**
 * Calculates optimal paddle velocity for strategic ball returns
 *
 * @param {Object} ball - Ball object
 * @param {Object} paddle - Paddle object
 * @param {Object} targetPosition - Where paddle should be
 * @param {string} strategy - Current strategy
 * @returns {Object} - Velocity optimization info
 */
function calculateVelocityStrategy(ball, paddle, targetPosition, strategy) {
    const dx = targetPosition.x - paddle.x;
    const dy = targetPosition.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
        // At position - now optimize impact velocity
        if (strategy === 'aggressive' || strategy === 'smash') {
            // Move INTO the ball for power
            return {
                vx: ball.vx > 0 ? -4 : 4, // Move against ball direction
                vy: 0,
                reason: 'power_hit'
            };
        } else if (strategy === 'absorb') {
            // Move WITH the ball to reduce return speed
            return {
                vx: ball.vx > 0 ? 2 : -2, // Move with ball
                vy: ball.vy > 0 ? 2 : -2,
                reason: 'soft_return'
            };
        }
    }

    return null; // Use normal movement to target
}

/**
 * Analyzes opponent's position and likely return angles
 */
function analyzeOpponentThreat(ball, prediction) {
    if (!prediction) return { threat: 'none', expectedReturnY: 250 };

    // Estimate where opponent might return ball from
    const estimatedOpponentY = ball.y; // Simplified - could track player1 position
    const threatLevel = prediction.confidence * (1 / Math.max(1, prediction.time / 50));

    // Predict likely return angle based on ball trajectory
    let expectedReturnY = 250; // Default center

    if (Math.abs(ball.vy) > Math.abs(ball.vx) * 0.5) {
        // Ball has vertical momentum - opponent likely to hit at angle
        expectedReturnY = prediction.y;
    } else {
        // Horizontal shot - opponent may return to center
        expectedReturnY = 250;
    }

    return {
        threat: threatLevel > 0.8 ? 'high' : threatLevel > 0.5 ? 'medium' : 'low',
        expectedReturnY: expectedReturnY,
        threatLevel: threatLevel
    };
}

/**
 * Enhanced interception strategy with velocity optimization
 */
function calculateInterceptionStrategy(ball, paddle, paddleShape, paddleScale) {
    const prediction = predictBallTrajectory(ball, PLAYER2_ZONE.left);

    if (!prediction) {
        // Defensive positioning based on opponent analysis
        const opponentThreat = analyzeOpponentThreat(ball, null);
        return {
            targetX: 650,
            targetY: Math.max(50, Math.min(450, opponentThreat.expectedReturnY)),
            strategy: 'defensive',
            urgency: 0.3,
            velocityStrategy: null
        };
    }

    // Calculate base target position
    const paddleCenterYOffset = paddleShape.centerY * paddleScale;
    let targetPaddleY = prediction.y - paddleCenterYOffset;
    let targetPaddleX = paddle.x;
    let strategy = 'intercept';
    let urgency = Math.min(1.0, 5.0 / Math.max(1, prediction.time));

    // Strategic positioning based on ball characteristics
    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const ballAngle = Math.atan2(ball.vy, ball.vx);

    // STRATEGIC SHOT SELECTION
    if (prediction.confidence > 0.7 && ballSpeed < 6) {
        // Good prediction, moderate speed - aim for corners
        if (prediction.y < 150) {
            // Ball coming high - smash down
            targetPaddleY = prediction.y - paddleShape.topY * paddleScale;
            strategy = 'smash_down';
        } else if (prediction.y > 350) {
            // Ball coming low - lift up
            targetPaddleY = prediction.y - paddleShape.bottomY * paddleScale;
            strategy = 'smash_up';
        } else {
            // Mid-height - aim for corners
            strategy = 'aim_corner';
        }
    } else if (ballSpeed > 8) {
        // Fast ball - focus on contact, use center
        targetPaddleY = prediction.y - paddleShape.centerY * paddleScale;
        strategy = 'defensive_block';
    } else if (Math.abs(ball.vy) > Math.abs(ball.vx)) {
        // High vertical component - counter with opposite spin
        if (ball.vy > 0) {
            targetPaddleY = prediction.y - paddleShape.bottomY * paddleScale;
            strategy = 'counter_spin_down';
        } else {
            targetPaddleY = prediction.y - paddleShape.topY * paddleScale;
            strategy = 'counter_spin_up';
        }
    }

    // Aggressive forward positioning when time permits
    if (prediction.time > 60 && ball.x < 500 && prediction.confidence > 0.6) {
        targetPaddleX = Math.max(PLAYER2_ZONE.left, paddle.x - 10);
        strategy = 'aggressive';
        urgency = 0.85;
    }

    // Velocity optimization
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
 * Improved chase logic with better opportunity detection
 */
function checkChaseOpportunity(ball, paddle, paddleShape, paddleScale) {
    const paddleRight = paddle.x + 16 * paddleScale;
    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    // More sophisticated chase detection
    const isBallBehind = ball.x > paddleRight + 10;
    const isBallSlow = ballSpeed < 4.5; // Increased threshold
    const isBallApproachable = ball.x < PLAYER2_ZONE.right - 20;

    // Calculate if chase is viable
    if ((isBallBehind || (ball.vx > 0 && ball.vx < 3)) && isBallSlow && isBallApproachable) {
        const distanceToBall = Math.sqrt(
            Math.pow(ball.x - (paddle.x + 8 * paddleScale), 2) +
            Math.pow(ball.y - (paddle.y + 8 * paddleScale), 2)
        );

        // Account for ball movement during chase
        const paddleSpeed = 4;
        const timeToReach = distanceToBall / paddleSpeed;
        const ballFutureX = ball.x + ball.vx * timeToReach;
        const ballFutureY = ball.y + ball.vy * timeToReach;

        // Check if future position is reachable and in bounds
        const maxReachX = PLAYER2_ZONE.right - 16 * paddleScale - 5;

        if (ballFutureX < maxReachX && ballFutureY > 0 && ballFutureY < CANVAS_HEIGHT) {
            // Verify we have SPACE to position paddle
            const targetX = Math.min(maxReachX, ballFutureX - 8 * paddleScale);

            return {
                targetX: targetX,
                targetY: ballFutureY - paddleShape.centerY * paddleScale,
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
        return null; // Too fast to loop
    }

    // Calculate spatial constraints
    const maxReachX = PLAYER2_ZONE.right - paddleWidth - 5;
    const idealTargetX = Math.min(maxReachX, ball.x + 40);

    // Verify we have space
    if (idealTargetX < PLAYER2_ZONE.left) {
        return null; // No space to position
    }

    // Calculate timing
    const distanceToTarget = Math.abs(idealTargetX - paddle.x);
    const timeToTarget = distanceToTarget / 4; // Paddle speed

    const distanceToWall = CANVAS_WIDTH - ball.x;
    const timeToWall = distanceToWall / Math.max(0.5, ball.vx);

    // Need comfortable margin
    if (timeToTarget < timeToWall * 0.7) {
        return {
            targetX: idealTargetX,
            targetY: ball.y - paddleShape.centerY * paddleScale,
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

    // Find optimal contact point based on strategy and paddle geometry
    let targetPixelY = paddleShape.centerY;

    if (strategy.includes('smash_down')) {
        // Use top of paddle
        targetPixelY = paddleShape.topY + 1;
    } else if (strategy.includes('smash_up')) {
        // Use bottom of paddle
        targetPixelY = paddleShape.bottomY - 1;
    } else if (strategy.includes('counter_spin')) {
        // Use edges for maximum spin
        if (prediction.finalVy > 0) {
            targetPixelY = paddleShape.bottomY;
        } else {
            targetPixelY = paddleShape.topY;
        }
    } else if (strategy === 'aim_corner') {
        // Use off-center contact for angles
        if (prediction.y < 250) {
            targetPixelY = paddleShape.centerY + 2;
        } else {
            targetPixelY = paddleShape.centerY - 2;
        }
    }

    return {
        offsetY: (targetPixelY - paddleShape.centerY) * paddleScale
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
    // Priority 2: Chase opportunity
    else {
        const chaseOpportunity = checkChaseOpportunity(ball, paddle, paddleShape, paddleScale);
        if (chaseOpportunity) {
            aiState.target = { x: chaseOpportunity.targetX, y: chaseOpportunity.targetY };
            aiState.strategy = chaseOpportunity.strategy;
            aiState.urgency = chaseOpportunity.urgency;
        }
        // Priority 3: Standard interception with strategic positioning
        else {
            const strategy = calculateInterceptionStrategy(ball, paddle, paddleShape, paddleScale);

            // Apply contact point optimization
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

    // Move toward target with full speed
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Apply urgency-based speed modulation for fine positioning
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
