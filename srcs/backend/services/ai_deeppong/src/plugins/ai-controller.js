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
        intervalId: null
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
        console.log(response.data.gameState)
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
    
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    
    console.log(`Starting AI game loop for game ${gameId} with update interval ${config.ai.updateInterval}ms`);
    console.log(`Player number: ${gameData.playerNumber}, AI name: ${gameData.aiName}, Difficulty: ${gameData.difficulty}`);
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    gameData.intervalId = setInterval(async () => {
      try {
        const gameState = await this.getGameState(gameId);
        
        if (!gameState) {
          failureCount++;
          console.log(`Failed to get game state for ${gameId} (failure count: ${failureCount})`);
          
          // If we've had too many consecutive failures, end the game
          if (failureCount >= MAX_FAILURES) {
            console.log(`Too many failures for game ${gameId}, ending AI participation`);
            this.endGame(gameId);
            return;
          }
          return;
        }
        
        failureCount = 0;
        gameData.gameState = gameState;
        
        // Log game state with full information for debugging
        console.log(`Game ${gameId} full state: ${JSON.stringify({
          gameState: gameState.gameState,
          ballPosition: gameState.ball ? [gameState.ball.x, gameState.ball.y] : 'unknown',
          paddlePosition: gameState.paddles ? 
            `P1: ${gameState.paddles[0]?.y}, P2: ${gameState.paddles[1]?.y}` : 'unknown'
        })}`);
        
        // Handle different game states
        if (gameState.gameState === 'playing') {
          const direction = this.calculateNextMove(gameId);
          console.log(`AI decided to move ${direction || 'stop'} for game ${gameId}`);
          
          if (direction !== gameData.lastDirection) {
            await this.sendMove(gameId, gameData.playerNumber, direction);
            gameData.lastDirection = direction;
          }
        } else if (gameState.gameState === 'finished' || gameState.gameState === 'cancelled') {
          console.log(`Game ${gameId} ended (${gameState.gameState}), releasing resources`);
          this.endGame(gameId);
        } else if (gameState.gameState === 'waiting') {
          console.log(`Game ${gameId} is waiting to start`);
        } else if (gameState.gameState === 'paused') {
          console.log(`Game ${gameId} is paused`);
        } else {
          console.log(`Game ${gameId} has unknown state: ${gameState.gameState}`);
        }
      } catch (error) {
        console.error(`Error in game loop ${gameId}: ${error.message}`);
        console.error(error.stack);
        failureCount++;
        
        // If we've had too many consecutive failures, end the game
        if (failureCount >= MAX_FAILURES) {
          console.error(`Too many errors for game ${gameId}, ending AI participation`);
          this.endGame(gameId);
        }
      }
    }, config.ai.updateInterval);
  }
  
  calculateNextMove(gameId) {
    console.log('CALCULANDO')
    const gameData = this.activeGames.get(gameId);
    if (!gameData || !gameData.gameState) {
      console.log(`No game data or state available for ${gameId}`);
      return null;
    }
    
    const { gameState, playerNumber, difficulty } = gameData;
    const diffSettings = config.ai.difficultyLevels[difficulty];
    
    console.log(`Game state structure: ${JSON.stringify(Object.keys(gameState))}`);

    // Adapt to the actual game state format
    // Check which properties are available
    if (!gameState.ball || !gameState.config) {
      console.log(`Missing critical game state data for ${gameId}: ball=${!!gameState.ball}, config=${!!gameState.config}`);
      return null;
    }
    
    // Map new structure to expected structure
    const ball = gameState.ball;
    
    // If velocity is not present, we need to calculate or default it
    if (!ball.velocity) {
      ball.velocity = { x: 0, y: 0 };
      // We can try to calculate velocity based on previous state
      if (gameData.previousBallPosition) {
        const timeDiff = gameState.timing?.currentTime - gameData.previousTimestamp;
        if (timeDiff > 0) {
          ball.velocity.x = (ball.x - gameData.previousBallPosition.x) / timeDiff * 1000; // Velocidad en unidades/segundo
          ball.velocity.y = (ball.y - gameData.previousBallPosition.y) / timeDiff * 1000;
        }
      }
    }
    
    // Store current position for future velocity calculation
    gameData.previousBallPosition = { x: ball.x, y: ball.y };
    gameData.previousTimestamp = gameState.timing?.currentTime || Date.now();
    
    // Set up size if not present
    if (!ball.size) {
      ball.size = gameState.config.ballSize || 10;
    }
    
    // Create paddles array from players
    const paddles = [];
    if (gameState.player1) {
      paddles[0] = {
        y: gameState.player1.y,
        height: gameState.config.paddleHeight,
        width: gameState.config.paddleWidth,
      };
    }
    
    if (gameState.player2) {
      paddles[1] = {
        y: gameState.player2.y,
        height: gameState.config.paddleHeight,
        width: gameState.config.paddleWidth,
      };
    }
    
    // Set up dimensions object
    const dimensions = {
      width: gameState.config.width,
      height: gameState.config.height
    };
    
    // Check if paddle exists for this player
    if (!paddles[playerNumber - 1]) {
      console.log(`No paddle data found for player ${playerNumber} in game ${gameId}`);
      return 'stop';
    }

    const paddle = paddles[playerNumber - 1];
    
    // Introduce random error to simulate difficulty
    if (Math.random() < diffSettings.errorRate) {
      // If there's "error" in decision, make random move or maintain current
      const randomMove = Math.random();
      if (randomMove < 0.4) return 'up';
      if (randomMove < 0.8) return 'down';
      return 'stop';
    }
    
    // Check if ball is coming towards us (based on calculated or existing velocity)
    const isComingTowardsUs = (playerNumber === 1 && ball.velocity.x < 0) || 
                              (playerNumber === 2 && ball.velocity.x > 0);
    
    const paddleCenter = paddle.y + paddle.height / 2;
    const targetY = ball.y + (ball.size / 2);
    
    // Log position data
    console.log(`Ball position: ${ball.x}, ${ball.y}, velocity: ${ball.velocity.x}, ${ball.velocity.y}`);
    console.log(`Paddle ${playerNumber} position: y=${paddle.y}, center=${paddleCenter}`);
    
    // If ball is coming towards us, try to intercept it
    if (isComingTowardsUs) {
      try {
        // Predict where the ball will hit using adapted data
        const predictedY = this.predictBallPosition({ 
          ball, 
          paddles, 
          dimensions 
        }, playerNumber);
        
        console.log(`Predicted Y position: ${predictedY}`);
        
        if (typeof predictedY !== 'number') {
          console.log(`Invalid predicted Y position for game ${gameId}`);
          return 'stop';
        }
        
        // Determine which direction to move paddle
        const offset = diffSettings.paddleCenterOffset * paddle.height; // Intentional deviation to simulate imprecision
        
        if (paddleCenter < predictedY - offset) {
          return 'down'; // Move down
        } else if (paddleCenter > predictedY + offset) {
          return 'up'; // Move up
        }
      } catch (error) {
        console.error(`Error predicting ball position: ${error.message}`);
        return 'stop';
      }
    } else {
      // If ball is moving away, try to return to center
      const screenCenterY = dimensions.height / 2;
      
      if (paddleCenter < screenCenterY - 10) {
        return 'down';
      } else if (paddleCenter > screenCenterY + 10) {
        return 'up';
      }
    }
    
    return 'stop'; // Stop if we're already in position
  }
  
  predictBallPosition(gameState, playerNumber) {
    try {
      const { ball, paddles, dimensions } = gameState;
      
      // Más registro detallado para debug
      console.log(`predictBallPosition input: ball=${JSON.stringify(ball)}, playerNumber=${playerNumber}`);
      console.log(`Paddles: ${JSON.stringify(paddles)}, Dimensions: ${JSON.stringify(dimensions)}`);
      
      // Validate required data
      if (!ball || !paddles || !dimensions) {
        console.log('Missing critical game state data in predictBallPosition');
        return dimensions ? dimensions.height / 2 : 200; // Default to center or 200 if no dimensions
      }
      
      // Check if we have a valid paddle for this player
      if (!paddles[playerNumber - 1]) {
        console.log(`No paddle data found for player ${playerNumber} in predictBallPosition`);
        return dimensions.height / 2; // Default to center
      }
      
      const paddle = paddles[playerNumber - 1];
      
      // Check if ball velocity exists and is valid
      if (!ball.velocity || typeof ball.velocity.x !== 'number' || typeof ball.velocity.y !== 'number') {
        console.log('Ball velocity data is invalid in predictBallPosition');
        return dimensions.height / 2; // Default to center
      }
      
      // If ball velocity is zero or near-zero, avoid division by zero
      if (Math.abs(ball.velocity.x) < 0.001) {
        return ball.y + (ball.size ? ball.size / 2 : 0);
      }
      
      // X position of player's side
      const targetX = playerNumber === 1 ? paddle.width : dimensions.width - paddle.width;
      
      // Calculate how long it will take to reach player's side
      const distX = Math.abs(targetX - ball.x);
      const timeToImpact = distX / Math.abs(ball.velocity.x);
      
      // Predict Y position based on velocity and time
      let predictedY = ball.y + ball.velocity.y * timeToImpact;
      
      console.log(`Ball initial trajectory calculation: targetX=${targetX}, distX=${distX}, timeToImpact=${timeToImpact}, raw predictedY=${predictedY}`);
      
      // Adjust for bounces off top and bottom walls
      if (dimensions.height > 0) {  // Prevent division by zero
        // Handle multiple bounces if needed
        if (predictedY < 0 || predictedY > dimensions.height) {
          const bounceCount = Math.floor(Math.abs(predictedY) / dimensions.height);
          console.log(`Ball would bounce ${bounceCount} times`);
          
          const normalizedY = ((predictedY % dimensions.height) + dimensions.height) % dimensions.height;
          
          if (bounceCount % 2 === 1) {
            // Odd number of bounces means we need to flip
            predictedY = dimensions.height - normalizedY;
          } else {
            // Even number of bounces
            predictedY = normalizedY;
          }
        }
      }
      
      console.log(`Final predicted Y position: ${predictedY}`);
      return predictedY;
    } catch (error) {
      console.error(`Error in predictBallPosition: ${error.message}`);
      console.error(error.stack);
      return null;
    }
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
    
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    
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
    });
    done();
  });
}

module.exports = fp(aiControllerPlugin);
module.exports.aiController = aiController;
