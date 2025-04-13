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
    this.isSecondSemifinal = options.isSecondSemifinal || false; // Añadimos esta propiedad explícitamente
    
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
    
    // AI players flags
    this.player1IsAI = false;
    this.player2IsAI = false;
    
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
    this.gameState = 'waiting'; // 'waiting', 'playing', 'paused', 'finished', 'next', 'cancelled'
    
    // CRÍTICO: Inicializar timestamp del último update con el tiempo actual
    const now = Date.now();
    this.lastUpdate = now;
    this.gameCreatedAt = now; // Nuevo: Guardar cuándo se creó el juego
    this.gameStartedAt = null; // Nuevo: Se establecerá cuando inicie el juego
    this.gameStateChangeTime = now; // Nuevo: Registrar cambios de estado
    
    // Status flags
    this.ballHitRecently = false;
    this.ballPaused = false;         // Nueva bandera para indicar si la bola está en pausa
    this.ballReadyTime = 0;          // Timestamp de cuando la bola estará lista para moverse

    // Timing related properties - CRÍTICO: Inicializar todos los contadores de tiempo
    this.pauseTime = null; // Timestamp when the game was paused
    this.totalPausedTime = 0; // Total time spent in pause (ms)
    this.pauseIntervals = []; // Track all pause intervals [start, end]

    // Performance tracking for adaptive timing
    this.consecutiveSlowFrames = 0;
  }

  // Método para verificar si un nombre corresponde a una IA
  isAIPlayer(playerName) {
    // Comprueba si el nombre del jugador está en la lista de nombres de IA
    if (!playerName) return false;
    
    // Hacemos la comparación insensible a mayúsculas/minúsculas
    return config.game.defaults.ai_opponents && 
           config.game.defaults.ai_opponents.some(aiName => 
             aiName.toLowerCase() === playerName.toLowerCase()
           );
  }

  // PLAYER NAME
  setPlayer(playerNumber, playerName) {
    if (playerNumber === 1) { 
      this.player1 = playerName; 
      this.player1IsAI = this.isAIPlayer(playerName);
    }
    else if (playerNumber === 2) { 
      this.player2 = playerName; 
      this.player2IsAI = this.isAIPlayer(playerName);
    }
  }

  // RESET BALL
  resetBall(scoringPlayer = null) {
    // Center the ball
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    
    // Determinar la dirección basada en quién marcó
    let direction;
    if (scoringPlayer === 1) {
      direction = 1;  // Ball goes to player 2 (right)
    } else if (scoringPlayer === 2) {
      direction = -1; // Ball goes to player 1 (left)
    } else {
      // Random direction for game start
      direction = Math.random() > 0.5 ? 1 : -1;
    }
    
    // Generar un ángulo aleatorio con más variación
    // Ahora permitimos ángulos entre -85° y 85°, incluyendo ángulos cercanos a 0° (trayectoria casi recta)
    // Distribución ponderada para favorecer ángulos moderados pero permitir extremos
    let angle;
    
    // 20% de probabilidad de una trayectoria casi recta (entre -10° y 10°)
    if (Math.random() < 0.2) {
      angle = (Math.random() * 20 - 10) * Math.PI / 180;
    }
    // 60% de probabilidad de un ángulo moderado (entre -45° y 45°, excluyendo -10° a 10°)
    else if (Math.random() < 0.8) {
      // Generar un ángulo entre -45° y 45°, pero excluyendo el rango de -10° a 10°
      let rawAngle = Math.random() * 35 + 10; // 10-45
      if (Math.random() > 0.5) rawAngle = -rawAngle; // 50% probabilidad de ser negativo
      angle = rawAngle * Math.PI / 180;
    }
    // 20% de probabilidad de un ángulo más extremo (entre -85° y -45° o entre 45° y 85°)
    else {
      let rawAngle = Math.random() * 40 + 45; // 45-85
      if (Math.random() > 0.5) rawAngle = -rawAngle; // 50% probabilidad de ser negativo
      angle = rawAngle * Math.PI / 180;
    }
    
    // Calcular velocidades basadas en el ángulo
    const baseSpeed = this.initialBallVelocity;
    
    // Usar una fórmula trigonométrica para mantener una velocidad total consistente
    this.ballVelX = direction * baseSpeed * Math.cos(angle);
    this.ballVelY = baseSpeed * Math.sin(angle);
    
    // Asegurar velocidad vertical mínima para evitar trayectorias demasiado horizontales
    if (Math.abs(this.ballVelY) < 0.5) {
      this.ballVelY = (Math.random() > 0.5 ? 0.5 : -0.5);
    }
    
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
      this.pauseTime = Date.now(); // Record when we paused
      return true;
    }
    return false;
  }
  
  // RESUME
  resume() {
    if (this.gameState === 'paused') {
      const now = Date.now();
      const pauseDuration = now - this.pauseTime;
      
      // Track this pause interval
      this.pauseIntervals.push({
        start: this.pauseTime,
        end: now,
        duration: pauseDuration
      });
      
      // Accumulate total paused time
      this.totalPausedTime += pauseDuration;
      
      this.gameState = 'playing';
      this.lastUpdate = now; // Update last update time to now
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
    
    // Calculate time delta with adaptive limits based on performance
    const now = Date.now();
    const rawDt = (now - this.lastUpdate) / 1000 * 60; // Convert to frames at 60 FPS
    
    // Adaptive maximum dt to prevent large jumps but still maintain smoothness
    // Allow larger jumps on slow networks while maintaining game speed
    const maxDt = Math.min(5, Math.max(3, this.consecutiveSlowFrames * 0.5));
    const dt = Math.min(rawDt, maxDt);
    
    // Track performance for adaptive timing
    if (rawDt > 3) {
      this.consecutiveSlowFrames = Math.min(10, this.consecutiveSlowFrames + 1);
    } else {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 0.5);
    }
    
    this.lastUpdate = now;
    
    // Update paddles based on movement state with variable speed
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
    
    // NUEVO: Verificar si la bola está en pausa
    if (this.ballPaused) {
      // Comprobar si ya pasó el tiempo de pausa
      if (now >= this.ballReadyTime) {
        this.ballPaused = false;
      } else {
        // Si la bola sigue en pausa, no actualizar su posición
        return;
      }
    }
    
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
          this.resetBall(2);
          break; // Exit the step loop after scoring
        } else if (this.ballX - this.ballSize/2 > this.width) {
          // Player 1 scores
          this.player1Score++;
          this.checkWinCondition();
          this.resetBall(1);
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
        paused: this.ballPaused,             // NUEVO: Indicar si la bola está en pausa
        readyTime: this.ballPaused ? this.ballReadyTime : null  // NUEVO: Tiempo cuando la bola se moverá
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
        currentTime: now, // Añadimos el tiempo actual para cálculos de cliente
        gameStateChangeTime: this.gameStateChangeTime || now // Tiempo de último cambio de estado
      }
    };
  }

  // Calculate the effective playing time (excluding pauses)
  getPlayingTime() {
    const now = Date.now();
    const totalElapsedTime = now - this.lastUpdate;
    
    // If we're currently paused, don't count time since pause began
    let currentPauseTime = 0;
    if (this.gameState === 'paused' && this.pauseTime) {
      currentPauseTime = now - this.pauseTime;
    }
    
    // Return effective playing time
    return totalElapsedTime - this.totalPausedTime - currentPauseTime;
  }
}

module.exports = PongGame;