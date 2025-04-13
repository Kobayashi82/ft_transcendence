"use strict";

const axios = require('axios');
const config = require('../config');
const fp = require('fastify-plugin');
const dns = require('dns');

class AIController {
  constructor() {
    this.activeGames = new Map(); // Map of active games: gameId -> {playerNumber, intervalId, gameState, difficulty}
    this.gameServiceUrl = config.services.game.url;
    console.log(`AI Controller initialized with game service URL: ${this.gameServiceUrl}`);
  }

  async joinGame(gameId, playerNumber, aiName, difficulty = config.ai.defaultDifficulty) {
    console.log(`AI ${aiName} joining game ${gameId} as player ${playerNumber}`);
    console.log(`Parameters received: gameId=${gameId}, playerNumber=${playerNumber}, aiName=${aiName}, difficulty=${difficulty}`);
    console.log(`Game service URL: ${this.gameServiceUrl}`);
    
    try {
      // Check if already in this game
      if (this.activeGames.has(gameId)) {
        console.log(`AI is already playing in game ${gameId}, ignoring request`);
        return true;
      }
      
      // Check if difficulty is valid
      console.log(`Available difficulty levels: ${Object.keys(config.ai.difficultyLevels).join(', ')}`);
      const validDifficulty = difficulty in config.ai.difficultyLevels ? 
        difficulty : config.ai.defaultDifficulty;
      console.log(`Using difficulty: ${validDifficulty}`);
      
      // Setup game data
      const gameData = {
        playerNumber,
        aiName,
        difficulty: validDifficulty,
        lastDirection: null,
        gameState: null,
        intervalId: null,
        moveIntervalId: null
      };
      
      console.log(`Setting up game data: ${JSON.stringify(gameData)}`);
      this.activeGames.set(gameId, gameData);
      
      // Start update loop
      console.log(`Starting game loop for game ${gameId}`);
      this.startGameLoop(gameId);
      
      console.log(`Successfully joined game ${gameId}`);
      return true;
    } catch (error) {
      console.error(`Error setting up AI game: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }
  
  async getGameState(gameId) {
    try {
      console.log(`Getting game state for ${gameId} from ${this.gameServiceUrl}/${gameId}`);
      
      const response = await axios.get(`${this.gameServiceUrl}/${gameId}`, {
        timeout: 2000
      });
      
      console.log(`Response from game service for ${gameId}: status=${response.status}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`Game state received successfully for ${gameId}`);
        return response.data.gameState;
      }
      console.warn(`Invalid response for game ${gameId}: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error) {
      console.error(`Error getting game state for ${gameId}: ${error.message}`);
      return null;
    }
  }
  
  startGameLoop(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) return;
    
    // Limpiar intervalos previos
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    
    console.log(`Starting AI game loop for game ${gameId} with update interval ${config.ai.updateInterval}ms`);
    
    // Inicializar variables de estado
    gameData.lastDirection = null;
    gameData.ballVelocity = null;
    gameData.pendingStopTime = null;
    gameData.previousBall = null;
    gameData.previousTime = null;
    
    // VALOR FIJO para la velocidad de la paleta (unidades por segundo)
    gameData.paddleSpeed = 300; // Valor más alto para asegurar que la paleta se mueva a una velocidad razonable
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // INTERVALO: Obtener estado y tomar decisiones - EXACTAMENTE config.ai.updateInterval (1000ms)
    gameData.intervalId = setInterval(async () => {
      try {
        const gameState = await this.getGameState(gameId);
        
        if (!gameState) {
          failureCount++;
          if (failureCount >= MAX_FAILURES) {
            this.endGame(gameId);
          }
          return;
        }
        
        failureCount = 0;
        
        // Si el juego terminó, limpiar recursos
        if (gameState.gameState === 'finished' || gameState.gameState === 'cancelled') {
          this.endGame(gameId);
          return;
        }
        
        // Actualizar estado del juego
        gameData.gameState = gameState;
        
        // Si no estamos jugando, no hacer nada más
        if (gameState.gameState !== 'playing') {
          return;
        }
        
        const now = Date.now();
        
        // Actualizar velocidad de la bola si tenemos datos anteriores
        if (gameData.previousBall && gameData.previousTime && gameState.ball) {
          const timeDelta = (now - gameData.previousTime) / 1000;  // en segundos
          
          if (timeDelta > 0) {
            const ballXDiff = gameState.ball.x - gameData.previousBall.x;
            const ballYDiff = gameState.ball.y - gameData.previousBall.y;
            
            const ballVelX = ballXDiff / timeDelta;
            const ballVelY = ballYDiff / timeDelta;
            
            // Actualizar velocidad de la bola
            gameData.ballVelocity = {
              x: ballVelX,
              y: ballVelY
            };
          }
        }
        
        // Guardar estado actual para la próxima iteración
        if (gameState.ball) {
          gameData.previousBall = { 
            x: gameState.ball.x, 
            y: gameState.ball.y 
          };
          gameData.previousTime = now;
        }
        
        // Manejar movimiento en cada actualización
        this.handleMovement(gameId);
        
      } catch (error) {
        console.error(`Error in game loop ${gameId}: ${error.message}`);
        failureCount++;
        
        if (failureCount >= MAX_FAILURES) {
          this.endGame(gameId);
        }
      }
    }, config.ai.updateInterval); // Usar EXACTAMENTE config.ai.updateInterval
    
    // Timer de seguridad: comprobar cada 200ms si es necesario detener la paleta
    gameData.moveIntervalId = setInterval(async () => {
      try {
        if (!gameData.pendingStopTime) return;
        
        const now = Date.now();
        if (now >= gameData.pendingStopTime) {
          console.log(`AI ${gameId}: Executing STOP command at ${now}`);
          await this.sendMove(gameId, gameData.playerNumber, 'stop');
          gameData.lastDirection = 'stop';
          gameData.pendingStopTime = null;
        }
        
        // Verificar si ha pasado demasiado tiempo desde el último comando (para evitar bloqueos)
        if (gameData.lastMoveTime && (now - gameData.lastMoveTime > 5000) && gameData.lastDirection !== 'stop') {
          console.log(`AI ${gameId}: No movement detected for 5 seconds, sending STOP as failsafe`);
          await this.sendMove(gameId, gameData.playerNumber, 'stop');
          gameData.lastDirection = 'stop';
          gameData.pendingStopTime = null;
        }
      } catch (error) {
        console.error(`Error in stop-timer loop ${gameId}: ${error.message}`);
      }
    }, 200);  // Verificar cada 200ms (suficientemente rápido para reaccionar, pero no demasiado exigente)
  }
  
  handleMovement(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData || !gameData.gameState) return;
    
    const { gameState, playerNumber, difficulty } = gameData;
    
    // Verificar que tenemos los datos necesarios
    if (!gameState.ball || gameState.gameState !== 'playing') return;
    
    const now = Date.now();
    gameData.lastMoveTime = now; // Actualizar timestamp del último movimiento procesado
    
    // Obtener la posición actual de la paleta
    const myPlayer = playerNumber === 1 ? gameState.player1 : gameState.player2;
    if (!myPlayer) return;
    
    const paddleY = myPlayer.y;
    const paddleHeight = gameState.config.paddleHeight;
    const paddleCenter = paddleY + paddleHeight / 2;
    
    // Calcular la posición objetivo
    const targetPosition = this.calculateTargetPosition(gameId);
    if (targetPosition === null) return;
    
    // Distancia al objetivo
    const distanceToTarget = targetPosition - paddleCenter;
    
    // Umbral basado en dificultad
    let threshold;
    switch (difficulty) {
      case 'impossible': threshold = 5; break; // un poco más de margen
      case 'hard': threshold = 10; break;
      case 'medium': threshold = 20; break;
      case 'easy': threshold = 30; break;
      default: threshold = 15;
    }
    
    // Si ya estamos suficientemente cerca, quedarnos quietos
    if (Math.abs(distanceToTarget) <= threshold) {
      if (gameData.lastDirection !== 'stop') {
        console.log(`AI ${gameId}: Already at target position, stopping`);
        this.sendMove(gameId, playerNumber, 'stop');
        gameData.lastDirection = 'stop';
        gameData.pendingStopTime = null; // Cancelar cualquier parada programada
      }
      return;
    }
    
    // Determinar dirección
    const direction = distanceToTarget > 0 ? 'down' : 'up';
    
    // Si ya tenemos programada una parada y no ha cambiado la dirección, respetar la parada
    if (gameData.pendingStopTime !== null && gameData.lastDirection === direction) {
      return;
    }
    
    // Si no hay cambio de dirección y estamos en movimiento, no hacer nada
    if (direction === gameData.lastDirection && gameData.lastDirection !== 'stop') {
      return;
    }
    
    // CÁLCULO BASADO EN TIEMPO usando paddleSpeed
    const paddleSpeed = gameData.paddleSpeed; // unidades por segundo
    const timeToTarget = Math.abs(distanceToTarget) / paddleSpeed * 1000; // en milisegundos
    
    // Iniciar movimiento y programar la parada
    console.log(`AI ${gameId}: Moving ${direction} to target Y=${Math.round(targetPosition)}, ` +
               `current Y=${Math.round(paddleCenter)}, distance=${Math.round(distanceToTarget)}, ` +
               `will stop in ${Math.round(timeToTarget)}ms`);
               
    this.sendMove(gameId, playerNumber, direction);
    gameData.lastDirection = direction;
    
    // Programar la detención para el momento exacto
    const stopTime = now + timeToTarget;
    gameData.pendingStopTime = stopTime;
  }
  
  calculateTargetPosition(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData || !gameData.gameState) return null;
    
    const { gameState, playerNumber, difficulty } = gameData;
    const ball = gameState.ball;
    const config = gameState.config;
    
    if (!ball || !config) return null;
    
    // Obtener dimensiones
    const gameWidth = config.width;
    const gameHeight = config.height;
    
    // Si no tenemos datos de velocidad todavía, simplemente seguir la pelota
    if (!gameData.ballVelocity) {
      return ball.y;
    }
    
    // Determinar si la bola viene hacia nosotros
    const ballVelX = gameData.ballVelocity.x;
    const isComingTowardsUs = (playerNumber === 1 && ballVelX < 0) ||
                             (playerNumber === 2 && ballVelX > 0);
    
    // Si la bola no viene hacia nosotros, mantenerse cerca del centro
    if (!isComingTowardsUs) {
      // Posición ligeramente inclinada hacia la pelota desde el centro
      return gameHeight / 2 * 0.8 + ball.y * 0.2;
    }
    
    // Calcular la posición X de nuestra paleta
    const paddleX = playerNumber === 1 ? config.paddleWidth : gameWidth - config.paddleWidth;
    
    // Tiempo hasta el impacto
    const distX = Math.abs(paddleX - ball.x);
    const timeToImpact = Math.abs(distX / ballVelX);
    
    // Predecir la posición Y en el momento del impacto
    let predictedY = ball.y + gameData.ballVelocity.y * timeToImpact;
    
    // Calcular rebotes simples si es necesario
    if (predictedY < 0) {
      predictedY = -predictedY;
    } else if (predictedY > gameHeight) {
      predictedY = 2 * gameHeight - predictedY;
    }
    
    // Asegurarse de que el resultado está dentro de los límites
    predictedY = Math.max(0, Math.min(gameHeight, predictedY));
    
    // Para niveles de dificultad más bajos, añadir un poco de error
    if (difficulty !== 'impossible' && difficulty !== 'hard') {
      const errorAmount = difficulty === 'easy' ? 40 : 20;
      if (Math.random() < 0.3) {
        predictedY += (Math.random() - 0.5) * errorAmount;
        predictedY = Math.max(0, Math.min(gameHeight, predictedY));
      }
    }
    
    return predictedY;
  }
  
  async sendMove(gameId, playerNumber, direction) {
    try {
      console.log(`Sending move for game ${gameId}: player=${playerNumber}, direction=${direction}`);
      
      if (!direction) {
        console.log(`Invalid move direction for game ${gameId}: ${direction}`);
        return false;
      }
      
      // Validate the URL before making the request
      if (!this.gameServiceUrl) {
        console.error(`Game service URL is not configured`);
        return false;
      }
      
      const moveUrl = `${this.gameServiceUrl}/${gameId}/move`;
      console.log(`Making POST request to: ${moveUrl}`);
      
      const moveData = {
        player: playerNumber,
        direction
      };
      console.log(`Move data: ${JSON.stringify(moveData)}`);
      
      const response = await axios.post(moveUrl, moveData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000
      });
      
      console.log(`Move response for game ${gameId}: status=${response.status}, data=${JSON.stringify(response.data)}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`Successfully sent move ${direction} for player ${playerNumber} in game ${gameId}`);
        return true;
      } else {
        console.warn(`Failed to send move: server returned status ${response.status}, success=${response.data.success}`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending move for game ${gameId}: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`No response received from server`);
      }
      console.error(`Stack trace: ${error.stack}`);
      return false;
    }
  }
  
  endGame(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) return;
    
    // Limpiar intervalos
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    
    // Asegurarse de detener cualquier movimiento
    if (gameData.lastDirection !== 'stop') {
      this.sendMove(gameId, gameData.playerNumber, 'stop').catch(err => {
        console.error(`Error stopping paddle on game end: ${err.message}`);
      });
    }
    
    this.activeGames.delete(gameId);
    console.log(`Game ${gameId} ended and resources released`);
  }
  
  getActiveGames() {
    const games = [];
    this.activeGames.forEach((data, gameId) => {
      games.push({
        gameId,
        playerNumber: data.playerNumber,
        aiName: data.aiName,
        difficulty: data.difficulty,
        isActive: !!data.intervalId
      });
    });
    return games;
  }
}

const aiController = new AIController();

async function aiControllerPlugin(fastify, options) {
  fastify.decorate('ai', aiController);
  
  fastify.addHook('onClose', (instance, done) => {
    aiController.activeGames.forEach((gameData, gameId) => {
      if (gameData.intervalId) clearInterval(gameData.intervalId);
      if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    });
    done();
  });
}

module.exports = fp(aiControllerPlugin);
module.exports.aiController = aiController;
