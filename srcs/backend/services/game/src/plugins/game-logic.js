"use strict";

const config = require('../config');

class PongGame {
  constructor(options = {}) {
    // Game settings
    this.ballSpeed = options.ballSpeed || config.game.defaults.ballSpeed;
    this.winningScore = options.winningScore || config.game.defaults.winningScore;
    this.accelerationEnabled = options.accelerationEnabled || config.game.defaults.accelerationEnabled;
    this.paddleSize = options.paddleSize || config.game.defaults.paddleSize;
    
    // Game dimensions
    this.width = config.game.width;
    this.height = config.game.height;
    
    // Edge padding for consistent visual and gameplay boundaries
    this.edgePadding = config.game.edgePadding || 20;
    
    // Apply paddle size settings
    let paddleHeightMultiplier = 1;
    if (this.paddleSize === 'short') {
      paddleHeightMultiplier = 0.7;
    } else if (this.paddleSize === 'long') {
      paddleHeightMultiplier = 1.3;
    }
    
    this.paddleHeight = config.game.paddleHeight * paddleHeightMultiplier;
    this.paddleWidth = config.game.paddleWidth;
    
    // Apply ball speed settings
    let speedMultiplier = 0.7;
    if (this.ballSpeed === 'slow') {
      speedMultiplier = 0.4;
    } else if (this.ballSpeed === 'fast') {
      speedMultiplier = 1.0;
    }
    
    this.ballSize = config.game.ballSize;
    this.initialBallVelocity = config.game.initialBallVelocity * speedMultiplier;
    
    // Player state
    this.player1 = null;
    this.player2 = null;
    this.player1Score = 0;
    this.player2Score = 0;
    this.player1Movement = null; // 'up', 'down', or null
    this.player2Movement = null; // 'up', 'down', or null
    
    // Initial paddle positions - centered with edge padding
    this.player1Y = (this.height - this.paddleHeight) / 2;
    this.player2Y = (this.height - this.paddleHeight) / 2;
    
    // Initialize ball
    this.resetBall();
    
    // Game state
    this.gameState = 'waiting'; // 'waiting', 'playing', 'paused', 'finished', 'cancelled'
    this.lastUpdate = Date.now();
    
    // Status flags
    this.ballHitRecently = false;
  }

  // PLAYER NAME
  setPlayer(playerNumber, playerName) {
    if (playerNumber === 1) { this.player1 = playerName; }
    else if (playerNumber === 2) { this.player2 = playerName; }
  }

  // RESET BALL
// In the resetBall method
resetBall() {
  // Center the ball
  this.ballX = this.width / 2;
  this.ballY = this.height / 2;
  
  // Random angle between -45 and 45 degrees
  const angle = (Math.random() * 90 - 45) * Math.PI / 180;
  
  // Random direction (left or right)
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  // Modified velocity calculation to maintain consistent horizontal speed
  // Horizontal speed is always consistent
  this.ballVelX = direction * this.initialBallVelocity;
  
  // Vertical velocity is scaled by tangent of angle
  this.ballVelY = this.ballVelX * Math.tan(angle);
  
  // Ensure minimum vertical velocity to avoid horizontal stalling
  if (Math.abs(this.ballVelY) < 2) {
    this.ballVelY = (Math.random() > 0.5 ? 1 : -1) * 2;
  }
  
  // Reset hit flag
  this.ballHitRecently = false;
}
  
  // START
  start() {
    if (this.gameState === 'waiting' || this.gameState === 'paused') {
      this.gameState = 'playing';
      this.lastUpdate = Date.now();
      return true;
    }
    return false;
  }
  
  // PAUSE
  pause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      return true;
    }
    return false;
  }
  
  // RESUME
  resume() {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.lastUpdate = Date.now();
      return true;
    }
    return false;
  }
  
  // CANCEL
  cancel() {
    this.gameState = 'cancelled';
    return true;
  }
  
  // PADDLE MOVE
  setPaddleMove(player, direction) {
    if (player === 1) { this.player1Movement = direction; }
    else if (player === 2) { this.player2Movement = direction; }
  }
  
  // PADDLE POSITION
  setPaddlePosition(player, y) {
    // Clamp position within playable area with edge padding
    const clampedY = Math.max(
      this.edgePadding, 
      Math.min(this.height - this.paddleHeight - this.edgePadding, y)
    );
    
    if (player === 1) { this.player1Y = clampedY; }
    else if (player === 2) { this.player2Y = clampedY; }
  }
  
  // CHECK COLLISIONS
  checkCollisions() {
    // Ball collision with top and bottom walls (with edge padding)
    if (this.ballY - this.ballSize/2 <= this.edgePadding) {
      // Top wall collision
      this.ballY = this.edgePadding + this.ballSize/2;
      this.ballVelY = Math.abs(this.ballVelY); // Force downward direction
      
      // Ensure minimum vertical velocity after bounce
      if (Math.abs(this.ballVelY) < 2) {
        this.ballVelY = 2;
      }
    } else if (this.ballY + this.ballSize/2 >= this.height - this.edgePadding) {
      // Bottom wall collision
      this.ballY = this.height - this.edgePadding - this.ballSize/2;
      this.ballVelY = -Math.abs(this.ballVelY); // Force upward direction
      
      // Ensure minimum vertical velocity after bounce
      if (Math.abs(this.ballVelY) < 2) {
        this.ballVelY = -2;
      }
    }
    
    // Calculate paddle positions with edge padding
    const paddle1Left = this.edgePadding;
    const paddle1Right = paddle1Left + this.paddleWidth;
    
    const paddle2Right = this.width - this.edgePadding;
    const paddle2Left = paddle2Right - this.paddleWidth;
    
    // Ball collision with left paddle (player 1)
    if (
      this.ballX - this.ballSize/2 <= paddle1Right &&
      this.ballX + this.ballSize/2 >= paddle1Left &&
      this.ballY + this.ballSize/2 >= this.player1Y &&
      this.ballY - this.ballSize/2 <= this.player1Y + this.paddleHeight &&
      !this.ballHitRecently
    ) {
      // Check if hitting the paddle from the front or sides
      if (this.ballX > paddle1Right - this.ballSize/2) {
        // Front collision - standard bounce
        this.ballX = paddle1Right + this.ballSize/2;
        this.ballVelX = Math.abs(this.ballVelX); // Ensure moving right
        
        // Adjust vertical velocity based on where the ball hit the paddle
        const hitPosition = (this.ballY - this.player1Y) / this.paddleHeight;
        this.ballVelY = (hitPosition - 0.5) * 10;
        
        // Increase ball speed if acceleration is enabled
        if (this.accelerationEnabled) {
          const speedIncreaseRate = 1.03;
          this.ballVelX *= speedIncreaseRate;
          this.ballVelY *= speedIncreaseRate;
        }
        
        // Set hit flag to prevent multiple hits
        this.ballHitRecently = true;
        setTimeout(() => { this.ballHitRecently = false; }, 100); // Clear after 100ms
      } else {
        // Side collision (top or bottom of paddle)
        // Reflect vertical velocity
        this.ballVelY = -this.ballVelY;
        
        // Adjust position to prevent sticking
        if (this.ballY < this.player1Y + this.paddleHeight/2) {
          this.ballY = this.player1Y - this.ballSize/2 - 1;
        } else {
          this.ballY = this.player1Y + this.paddleHeight + this.ballSize/2 + 1;
        }
      }
    }
    
    // Ball collision with right paddle (player 2)
    if (
      this.ballX + this.ballSize/2 >= paddle2Left &&
      this.ballX - this.ballSize/2 <= paddle2Right &&
      this.ballY + this.ballSize/2 >= this.player2Y &&
      this.ballY - this.ballSize/2 <= this.player2Y + this.paddleHeight &&
      !this.ballHitRecently
    ) {
      // Check if hitting the paddle from the front or sides
      if (this.ballX < paddle2Left + this.ballSize/2) {
        // Front collision - standard bounce
        this.ballX = paddle2Left - this.ballSize/2;
        this.ballVelX = -Math.abs(this.ballVelX); // Ensure moving left
        
        // Adjust vertical velocity based on where the ball hit the paddle
        const hitPosition = (this.ballY - this.player2Y) / this.paddleHeight;
        this.ballVelY = (hitPosition - 0.5) * 10;
        
        // Increase ball speed if acceleration is enabled
        if (this.accelerationEnabled) {
          const speedIncreaseRate = 1.05; // Reduced from original 1.1 for better control
          this.ballVelX *= speedIncreaseRate;
          this.ballVelY *= speedIncreaseRate;
        }
        
        // Set hit flag to prevent multiple hits
        this.ballHitRecently = true;
        setTimeout(() => { this.ballHitRecently = false; }, 100); // Clear after 100ms
      } else {
        // Side collision (top or bottom of paddle)
        // Reflect vertical velocity
        this.ballVelY = -this.ballVelY;
        
        // Adjust position to prevent sticking
        if (this.ballY < this.player2Y + this.paddleHeight/2) {
          this.ballY = this.player2Y - this.ballSize/2 - 1;
        } else {
          this.ballY = this.player2Y + this.paddleHeight + this.ballSize/2 + 1;
        }
      }
    }
    
    // Apply maximum speed limit to prevent the ball from moving too fast
    const maxSpeed = 15;
    const currentSpeed = Math.sqrt(this.ballVelX * this.ballVelX + this.ballVelY * this.ballVelY);
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.ballVelX *= scale;
      this.ballVelY *= scale;
    }
  }
  
  // UPDATE
  update() {
    if (this.gameState !== 'playing') return;
    
    // Calculate time delta with maximum limit to prevent large jumps
    const now = Date.now();
    const rawDt = (now - this.lastUpdate) / 16; // Normalize to 60 FPS
    const dt = Math.min(rawDt, 3); // Limit maximum dt to 3 frames worth (prevents teleporting)
    this.lastUpdate = now;
    
    // Update paddles based on movement state
    const paddleSpeed = 5 * dt;
    
    if (this.player1Movement === 'up') {
      this.player1Y = Math.max(this.edgePadding, this.player1Y - paddleSpeed);
    } else if (this.player1Movement === 'down') {
      this.player1Y = Math.min(this.height - this.paddleHeight - this.edgePadding, this.player1Y + paddleSpeed);
    }
    
    if (this.player2Movement === 'up') {
      this.player2Y = Math.max(this.edgePadding, this.player2Y - paddleSpeed);
    } else if (this.player2Movement === 'down') {
      this.player2Y = Math.min(this.height - this.paddleHeight - this.edgePadding, this.player2Y + paddleSpeed);
    }
    
    // Store previous ball position to detect boundary crossing
    const prevBallX = this.ballX;
    
    // For very large dt values, step the ball movement gradually
    if (dt > 1.5) {
      const steps = Math.ceil(dt / 1.0); // Break into steps of 1.0 or smaller
      const stepDt = dt / steps;
      
      for (let i = 0; i < steps; i++) {
        // Move ball for one step
        this.ballX += this.ballVelX * stepDt;
        this.ballY += this.ballVelY * stepDt;
        
        // Check collisions after each step
        this.checkCollisions();
        
        // Check for scoring
        if (this.ballX + this.ballSize/2 < 0) {
          // Player 2 scores
          this.player2Score++;
          this.checkWinCondition();
          this.resetBall();
          break; // Exit the step loop after scoring
        } else if (this.ballX - this.ballSize/2 > this.width) {
          // Player 1 scores
          this.player1Score++;
          this.checkWinCondition();
          this.resetBall();
          break; // Exit the step loop after scoring
        }
      }
    } else {
      // Normal movement for small dt values
      this.ballX += this.ballVelX * dt;
      this.ballY += this.ballVelY * dt;
      
      // Check collisions
      this.checkCollisions();
      
      // Ball out of bounds (scoring)
      if (this.ballX + this.ballSize/2 < 0) {
        // Player 2 scores
        this.player2Score++;
        this.checkWinCondition();
        this.resetBall();
      } else if (this.ballX - this.ballSize/2 > this.width) {
        // Player 1 scores
        this.player1Score++;
        this.checkWinCondition();
        this.resetBall();
      }
    }
  }
  
  // WIN CHECK
  checkWinCondition() {
    if (this.player1Score >= this.winningScore || this.player2Score >= this.winningScore) {
      this.gameState = 'finished';
      
      // TODO: Send game results to stats service
      // This would be implemented in the game manager
      // gameManager.sendGameResultsToStats(gameId, this.getState());
    }
  }
  
  // STATE
  getState() {
    return {
      gameState: this.gameState,
      player1: {
        name: this.player1,
        y: this.player1Y,
        score: this.player1Score
      },
      player2: {
        name: this.player2,
        y: this.player2Y,
        score: this.player2Score
      },
      ball: {
        x: this.ballX,
        y: this.ballY
      },
      config: {
        width: this.width,
        height: this.height,
        paddleHeight: this.paddleHeight,
        paddleWidth: this.paddleWidth,
        ballSize: this.ballSize,
        winningScore: this.winningScore,
        edgePadding: this.edgePadding
      },
      settings: {
        ballSpeed: this.ballSpeed,
        accelerationEnabled: this.accelerationEnabled,
        paddleSize: this.paddleSize
      }
    };
  }
}

module.exports = PongGame;