"use strict";

const config = require('../config');

class PongGame {

  constructor(options = {}) {
    // Game settings
    this.ballSpeed = options.ballSpeed || config.game.defaults.ballSpeed;
    this.winningScore = options.winningScore || config.game.defaults.winningScore;
    this.accelerationEnabled = options.accelerationEnabled || config.game.defaults.accelerationEnabled;
    this.paddleSize = options.paddleSize || config.game.defaults.paddleSize;

    // Tournament mode settings
    this.tournamentMode = options.tournamentMode || false;
    this.tournamentRound = options.tournamentRound || 0;
    this.isSecondSemifinal = options.isSecondSemifinal || false;

    // Game dimensions
    this.width = config.game.width;
    this.height = config.game.height;

    // Edge padding
    this.edgePadding = config.game.edgePadding || 20;

    // Paddle size
    let paddleHeightMultiplier = 1;
    if (this.paddleSize === 'short')      paddleHeightMultiplier = 0.7;
    else if (this.paddleSize === 'long')  paddleHeightMultiplier = 1.3;

    this.paddleHeight = config.game.paddleHeight * paddleHeightMultiplier;
    this.paddleWidth = config.game.paddleWidth;

    // Ball speed
    let speedMultiplier = 0.7;
    if (this.ballSpeed === 'slow')        speedMultiplier = 0.4;
    else if (this.ballSpeed === 'fast')   speedMultiplier = 1.0;

    this.ballSize = config.game.ballSize;
    this.initialBallVelocity = config.game.initialBallVelocity * speedMultiplier;

    // Players
    this.player1 = null;
    this.player2 = null;

    this.player1IsAI = false;
    this.player2IsAI = false;

    this.player1Score = 0;
    this.player2Score = 0;
    this.player1Movement = null;
    this.player2Movement = null;

    this.player1Y = (this.height - this.paddleHeight) / 2;
    this.player2Y = (this.height - this.paddleHeight) / 2;

    // Game state
    this.resetBall();
    this.gameState = 'waiting';

    const now = Date.now();
    this.lastUpdate = now;
    this.gameCreatedAt = now;
    this.gameStartedAt = null;
    this.gameStateChangeTime = now;

    this.ballHitRecently = false;
    this.ballPaused = false;
    this.ballReadyTime = 0;
    this.pauseTime = null;
    this.totalPausedTime = 0;
    this.pauseIntervals = [];
    this.consecutiveSlowFrames = 0;
  }

  isAIPlayer(playerName) {
    if (!playerName) return false;
    return config.game.defaults.ai_opponents && config.game.defaults.ai_opponents.some(aiName => aiName.toLowerCase() === playerName.toLowerCase());
  }

  // PLAYER NAME
  setPlayer(playerNumber, playerName) {
    if (playerNumber === 1) {
      this.player1 = playerName;
      this.player1IsAI = this.isAIPlayer(playerName);
    } else if (playerNumber === 2) {
      this.player2 = playerName; 
      this.player2IsAI = this.isAIPlayer(playerName);
    }
  }

  // RESET BALL
  resetBall(scoringPlayer = null) {
    // Center the ball
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    
    let direction;
    if      (scoringPlayer === 1)   direction = 1;
    else if (scoringPlayer === 2)   direction = -1;
    else                            direction = Math.random() > 0.5 ? 1 : -1;
    
    // Generate random angle between -45° and 45°
    const angle = (Math.random() * 90 - 45) * Math.PI / 180;
    
    // Calculate velocities based on the angle
    const baseSpeed = this.initialBallVelocity;
    
    // Maintain consistent total speed
    this.ballVelX = direction * baseSpeed * Math.cos(angle);
    this.ballVelY = baseSpeed * Math.sin(angle);
    if (Math.abs(this.ballVelY) < 0.5) this.ballVelY = (Math.random() > 0.5 ? 0.5 : -0.5);
    
    // Reset hit flag
    this.ballHitRecently = false;
    
    // Activar pausa de la bola
    this.ballPaused = true;
    this.ballReadyTime = Date.now() + 500;
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
      this.pauseTime = Date.now();
      return true;
    }
    return false;
  }

  // RESUME
  resume() {
    if (this.gameState === 'paused') {
      const now = Date.now();
      const pauseDuration = now - this.pauseTime;

      this.pauseIntervals.push({ start: this.pauseTime, end: now, duration: pauseDuration });
      this.totalPausedTime += pauseDuration;
      this.gameState = 'playing';
      this.lastUpdate = now;
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
    const clampedY = Math.max(this.edgePadding, Math.min(this.height - this.paddleHeight - this.edgePadding, y));
    
    if (player === 1) { this.player1Y = clampedY; }
    else if (player === 2) { this.player2Y = clampedY; }
  }
  
  // CHECK COLLISIONS
  checkCollisions() {
    if (this.ballY - this.ballSize/2 <= this.edgePadding) {
      // Top wall collision
      this.ballY = this.edgePadding + this.ballSize/2;
      this.ballVelY = Math.abs(this.ballVelY);

      if (Math.abs(this.ballVelY) < 2) this.ballVelY = 2;
    } else if (this.ballY + this.ballSize/2 >= this.height - this.edgePadding) {
      // Bottom wall collision
      this.ballY = this.height - this.edgePadding - this.ballSize/2;
      this.ballVelY = -Math.abs(this.ballVelY);

      if (Math.abs(this.ballVelY) < 2) this.ballVelY = -2;
    }
    
    // Calculate paddle positions
    const paddle1Left = this.edgePadding;
    const paddle1Right = paddle1Left + this.paddleWidth;
    const paddle2Right = this.width - this.edgePadding;
    const paddle2Left = paddle2Right - this.paddleWidth;
    
    // Ball collision with left paddle
    if (
      this.ballX - this.ballSize/2 <= paddle1Right &&
      this.ballX + this.ballSize/2 >= paddle1Left &&
      this.ballY + this.ballSize/2 >= this.player1Y &&
      this.ballY - this.ballSize/2 <= this.player1Y + this.paddleHeight && !this.ballHitRecently
    ) {
      // Check if hitting the paddle from the front or sides
      if (this.ballX > paddle1Right - this.ballSize/2) {
        this.ballX = paddle1Right + this.ballSize/2;
        this.ballVelX = Math.abs(this.ballVelX);
        const hitPosition = (this.ballY - this.player1Y) / this.paddleHeight;
        this.ballVelY = (hitPosition - 0.5) * 10;
        if (this.accelerationEnabled) {
          const speedIncreaseRate = 1.05;
          this.ballVelX *= speedIncreaseRate;
          this.ballVelY *= speedIncreaseRate;
        }
        this.ballHitRecently = true;
        setTimeout(() => { this.ballHitRecently = false; }, 100);
      } else {
        this.ballVelY = -this.ballVelY;
        if (this.ballY < this.player1Y + this.paddleHeight/2) this.ballY = this.player1Y - this.ballSize/2 - 1;
        else                                                  this.ballY = this.player1Y + this.paddleHeight + this.ballSize/2 + 1;
      }
    }
    
    // Ball collision with right paddle
    if (
      this.ballX + this.ballSize/2 >= paddle2Left &&
      this.ballX - this.ballSize/2 <= paddle2Right &&
      this.ballY + this.ballSize/2 >= this.player2Y &&
      this.ballY - this.ballSize/2 <= this.player2Y + this.paddleHeight && !this.ballHitRecently
    ) {
      // Check if hitting the paddle from the front or sides
      if (this.ballX < paddle2Left + this.ballSize/2) {
        this.ballX = paddle2Left - this.ballSize/2;
        this.ballVelX = -Math.abs(this.ballVelX);
        const hitPosition = (this.ballY - this.player2Y) / this.paddleHeight;
        this.ballVelY = (hitPosition - 0.5) * 10;
        if (this.accelerationEnabled) {
          const speedIncreaseRate = 1.05;
          this.ballVelX *= speedIncreaseRate;
          this.ballVelY *= speedIncreaseRate;
        }
        this.ballHitRecently = true;
        setTimeout(() => { this.ballHitRecently = false; }, 100);
      } else {
        this.ballVelY = -this.ballVelY;
        if (this.ballY < this.player2Y + this.paddleHeight/2) this.ballY = this.player2Y - this.ballSize/2 - 1;
        else                                                  this.ballY = this.player2Y + this.paddleHeight + this.ballSize/2 + 1;
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
    
    const now = Date.now();
    const rawDt = (now - this.lastUpdate) / 1000 * 60;
    const maxDt = Math.min(5, Math.max(3, this.consecutiveSlowFrames * 0.5));
    const dt = Math.min(rawDt, maxDt);

    if (rawDt > 3)  this.consecutiveSlowFrames = Math.min(10, this.consecutiveSlowFrames + 1);
    else            this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 0.5);

    this.lastUpdate = now;
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
    
    if (this.ballPaused) {
      if (now >= this.ballReadyTime)  this.ballPaused = false;
      else                            return;
    }

    if (dt > 1.5) {
      const steps = Math.ceil(dt / 1.0);
      const stepDt = dt / steps;
      
      for (let i = 0; i < steps; i++) {
        this.ballX += this.ballVelX * stepDt;
        this.ballY += this.ballVelY * stepDt;
        this.checkCollisions();

        // Check for scoring
        if (this.ballX + this.ballSize/2 < 0) {
          // Player 2 scores
          this.player2Score++;
          this.checkWinCondition();
          this.resetBall(2);
          break;
        } else if (this.ballX - this.ballSize/2 > this.width) {
          // Player 1 scores
          this.player1Score++;
          this.checkWinCondition();
          this.resetBall(1);
          break;
        }
      }
    } else {
      this.ballX += this.ballVelX * dt;
      this.ballY += this.ballVelY * dt;
      this.checkCollisions();
      
      // Ball out of bounds (scoring)
      if (this.ballX + this.ballSize/2 < 0) {
        // Player 2 scores
        this.player2Score++;
        this.checkWinCondition();
        this.resetBall(2);
      } else if (this.ballX - this.ballSize/2 > this.width) {
        // Player 1 scores
        this.player1Score++;
        this.checkWinCondition();
        this.resetBall(1);
      }
    }
  }
  
  // WIN CHECK
  checkWinCondition() {
    if (this.player1Score >= this.winningScore || this.player2Score >= this.winningScore) {
      if (this.tournamentMode)  this.gameState = 'next';
      else                      this.gameState = 'finished';
    }
  }
  
  // STATE
  getState() {
    const now = Date.now();
    
    return {
      gameState: this.gameState,
      player1: {
        name: this.player1,
        y: this.player1Y,
        score: this.player1Score,
        isAI: this.player1IsAI
      },
      player2: {
        name: this.player2,
        y: this.player2Y,
        score: this.player2Score,
        isAI: this.player2IsAI
      },
      ball: {
        x: this.ballX,
        y: this.ballY,
        paused: this.ballPaused,
        readyTime: this.ballPaused ? this.ballReadyTime : null
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
        paddleSize: this.paddleSize,
        tournamentMode: this.tournamentMode,
        tournamentRound: this.tournamentRound,
        isSecondSemifinal: this.isSecondSemifinal || false
      },
      timing: {
        totalPausedTime: this.totalPausedTime,
        pauseIntervals: this.pauseIntervals,
        lastUpdate: this.lastUpdate,
        currentTime: now,
        gameStateChangeTime: this.gameStateChangeTime || now
      }
    }
  }

  getPlayingTime() {
    const now = Date.now();
    const totalElapsedTime = now - this.lastUpdate;

    let currentPauseTime = 0;
    if (this.gameState === 'paused' && this.pauseTime) currentPauseTime = now - this.pauseTime;

    return totalElapsedTime - this.totalPausedTime - currentPauseTime;
  }

}

module.exports = PongGame;
