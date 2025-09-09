// AI Controller for Custom Pong Game
// Extracted from game.js for modular development

/**
 * Handles AI player movement based on current game state
 * @param {Object} ball - The ball object with position and velocity
 * @param {Object} aiPlayer - The AI player object
 * @param {Object} aiState - The AI internal state object
 * @param {number} difficulty - Difficulty level (1-10)
 * @param {number} paddleSize - Size of the paddle in pixels
 * @param {number} speed - Base movement speed
 * @returns {Object} Updated velocities {vx, vy} for the AI player
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
 * @param {number} difficultyLevel - Numeric difficulty level (1-10)
 * @returns {string} Text description of the difficulty
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

// Export AI functions
export { calculateAIMovement, getAIDifficultyName };
