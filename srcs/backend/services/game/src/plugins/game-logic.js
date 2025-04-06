"use strict";

const config = require('../config');

class PongGame {
  constructor(options = {}) {
    this.ballSpeed = options.ballSpeed || config.game.defaults.ballSpeed,
    this.winningScore = options.winningScore || config.game.defaults.winningScore,
    this.accelerationEnabled = options.accelerationEnabled || config.game.defaults.accelerationEnabled,
    this.paddleSize = options.paddleSize || config.game.defaults.paddleSize
    
    this.width = 600;
    this.height = 400;
    
    const paddleSizes = { short: 40, medium: 80, long: 120 };
    this.paddleHeight = paddleSizes[this.paddleSize];
    this.paddleWidth = 10;
    
    const initialSpeeds = { slow: 4, medium: 6, fast: 8 };
    this.initialBallVelocity = initialSpeeds[this.ballSpeed];
    this.ballSize = 10;
    
    this.player1 = null;
    this.player2 = null;
    this.player1Score = 0;
    this.player2Score = 0;
    this.player1Movement = null; // 'up', 'down', or null
    this.player2Movement = null; // 'up', 'down', or null
    this.player1Y = (this.height - this.paddleHeight) / 2;
    this.player2Y = (this.height - this.paddleHeight) / 2;
    this.resetBall();
        
    this.gameState = 'waiting'; // 'waiting', 'playing', 'paused', 'finished', 'cancelled'
    this.lastUpdate = Date.now();
  }

  // PLAYER NAME
  setPlayer(playerNumber, playerName) {
    if      (playerNumber === 1) { this.player1 = playerName; }
    else if (playerNumber === 2) { this.player2 = playerName; }
  }

  // RESET BALL
  resetBall() {
    // Center the ball
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    
    // Random angle between -45 and 45 degrees
    const angle = (Math.random() * 90 - 45) * Math.PI / 180;
    
    // Random direction (left or right)
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // Initial velocity
    this.ballVelX = direction * this.initialBallVelocity * Math.cos(angle);
    this.ballVelY = this.initialBallVelocity * Math.sin(angle);
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
    if      (player === 1) { this.player1Movement = direction; }
    else if (player === 2) { this.player2Movement = direction; }
  }
  
  // PADDLE POSTITION
  setPaddlePosition(player, y) {
    const clampedY = Math.max(0, Math.min(this.height - this.paddleHeight, y));
    
    if      (player === 1) { this.player1Y = clampedY; }
    else if (player === 2) { this.player2Y = clampedY; }
  }
  
  // UPDATE
  update() {
    if (this.gameState !== 'playing') return;
    
    // Calculate time delta for frame-rate independent movement
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 16; // Normalize to 60 FPS
    this.lastUpdate = now;
    
    // Update paddles based on movement state
    const paddleSpeed = 5 * dt;
    
    if (this.player1Movement === 'up') {
      this.player1Y = Math.max(0, this.player1Y - paddleSpeed);
    } else if (this.player1Movement === 'down') {
      this.player1Y = Math.min(this.height - this.paddleHeight, this.player1Y + paddleSpeed);
    }
    
    if (this.player2Movement === 'up') {
      this.player2Y = Math.max(0, this.player2Y - paddleSpeed);
    } else if (this.player2Movement === 'down') {
      this.player2Y = Math.min(this.height - this.paddleHeight, this.player2Y + paddleSpeed);
    }
    
    // Update ball position
    this.ballX += this.ballVelX * dt;
    this.ballY += this.ballVelY * dt;
    
    // Ball collision with top and bottom walls
    if (this.ballY <= 0 || this.ballY >= this.height - this.ballSize) {
      this.ballVelY = -this.ballVelY;
    }
    
    // Ball collision with left paddle (player 1)
    if (
      this.ballX <= this.paddleWidth &&
      this.ballY + this.ballSize >= this.player1Y &&
      this.ballY <= this.player1Y + this.paddleHeight
    ) {
      // Reflect ball and adjust angle based on where it hit the paddle
      this.ballX = this.paddleWidth;
      this.ballVelX = -this.ballVelX;
      
      // Adjust vertical velocity based on where the ball hit the paddle
      const hitPosition = (this.ballY - this.player1Y) / this.paddleHeight;
      this.ballVelY = (hitPosition - 0.5) * 10;
      
      // Increase ball speed if acceleration is enabled
      if (this.accelerationEnabled) {
        this.ballVelX *= 1.1;
        this.ballVelY *= 1.1;
      }
      
    }
    
    // Ball collision with right paddle (player 2)
    if (
      this.ballX >= this.width - this.paddleWidth - this.ballSize &&
      this.ballY + this.ballSize >= this.player2Y &&
      this.ballY <= this.player2Y + this.paddleHeight
    ) {
      // Reflect ball and adjust angle based on where it hit the paddle
      this.ballX = this.width - this.paddleWidth - this.ballSize;
      this.ballVelX = -this.ballVelX;
      
      // Adjust vertical velocity based on where the ball hit the paddle
      const hitPosition = (this.ballY - this.player2Y) / this.paddleHeight;
      this.ballVelY = (hitPosition - 0.5) * 10;
      
      // Increase ball speed if acceleration is enabled
      if (this.accelerationEnabled) {
        this.ballVelX *= 1.1;
        this.ballVelY *= 1.1;
      }
    }
    
    // Ball out of bounds (scoring)
    if (this.ballX < 0) {
      // Player 2 scores
      this.player2Score++;
      this.checkWinCondition();
      this.resetBall();
    } else if (this.ballX > this.width) {
      // Player 1 scores
      this.player1Score++;
      this.checkWinCondition();
      this.resetBall();
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
        winningScore: this.winningScore
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
