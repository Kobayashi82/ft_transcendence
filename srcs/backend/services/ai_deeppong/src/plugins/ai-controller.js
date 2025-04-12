"use strict";

const axios = require('axios');
const config = require('../config');
const fp = require('fastify-plugin');
const dns = require('dns');

/**
 * AI DeepPong Controller
 * Manages the AI logic to play Pong games
 */
class AIController {
  constructor() {
    this.activeGames = new Map(); // Map of active games: gameId -> {playerNumber, intervalId, gameState, difficulty}
    this.gameServiceUrl = config.services.game.url;
    console.log(`AI Controller initialized with game service URL: ${this.gameServiceUrl}`);
  }

  /**
   * Register a new AI game
   * @param {string} gameId - Game ID
   * @param {number} playerNumber - Assigned player number (1 or 2)
   * @param {string} aiName - AI name
   * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard', 'impossible')
   */
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
  
  /**
   * Get current game state
   * @param {string} gameId - Game ID
   * @returns {Object|null} - Game state or null if error
   */
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
      if (error.response) {
        console.error(`Response error for ${gameId}: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`);
      }
      // Specifically handle timeout or connection failures
      if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
        console.error(`Connection failed for game ${gameId}, terminating AI game`);
      }
      return null;
    }
  }
  
  /**
   * Start game loop for a match
   * @param {string} gameId - Game ID
   */
  startGameLoop(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) return;
    
    // Clear previous interval if exists
    if (gameData.intervalId) {
      clearInterval(gameData.intervalId);
    }
    
    // Log that we're starting the game loop
    console.log(`Starting AI game loop for game ${gameId} with update interval ${config.ai.updateInterval}ms`);
    console.log(`Player number: ${gameData.playerNumber}, AI name: ${gameData.aiName}, Difficulty: ${gameData.difficulty}`);
    
    // Initial connectivity test to verify game service is reachable
    this.testGameServiceConnection(gameId);
    
    // Track consecutive failures
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // Create new interval to update state and make decisions
    gameData.intervalId = setInterval(async () => {
      try {
        // Get current game state
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
          return; // Skip this iteration but keep trying
        }
        
        // Reset failure count on success
        failureCount = 0;
        
        // Update game state
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
          // Game has ended, release resources
          console.log(`Game ${gameId} ended (${gameState.gameState}), releasing resources`);
          this.endGame(gameId);
        } else if (gameState.gameState === 'waiting') {
          console.log(`Game ${gameId} is waiting to start`);
        } else if (gameState.gameState === 'paused') {
          console.log(`Game ${gameId} is paused`);
        } else {
          // Handle any other game state
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
  
  /**
   * Test connection to game service
   * @param {string} gameId - Game ID to use for testing
   */
  async testGameServiceConnection(gameId) {
    try {
      console.log(`Testing connection to game service at ${this.gameServiceUrl}`);
      
      // Try to ping the game service options endpoint as a health check
      const response = await axios.get(`${this.gameServiceUrl}/options`, {
        timeout: 2000
      });
      
      if (response.status === 200) {
        console.log(`Game service is reachable. Response: ${JSON.stringify(response.data)}`);
        return true;
      } else {
        console.warn(`Game service responded but with unexpected status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`Error connecting to game service: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`No response received from ${this.gameServiceUrl}`);
      }
      
      // Try to resolve the hostname to check network connectivity
      try {
        const url = new URL(this.gameServiceUrl);
        const hostname = url.hostname;
        
        console.log(`Trying to resolve hostname: ${hostname}`);
        dns.lookup(hostname, (err, address, family) => {
          if (err) {
            console.error(`DNS lookup failed for ${hostname}: ${err.message}`);
          } else {
            console.log(`Hostname ${hostname} resolved to ${address} (IPv${family})`);
          }
        });
      } catch (dnsError) {
        console.error(`Error performing DNS lookup: ${dnsError.message}`);
      }
      
      return false;
    }
  }
  
  /**
   * Calculate the AI's next move based on game state
   * @param {string} gameId - Game ID
   * @returns {string|null} - Move direction ('up', 'down', or 'stop')
   */
  calculateNextMove(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData || !gameData.gameState) return null;
    
    const { gameState, playerNumber, difficulty } = gameData;
    const diffSettings = config.ai.difficultyLevels[difficulty];
    
    // Game data
    const { ball, paddles, dimensions } = gameState;
    const paddle = paddles[playerNumber - 1];
    
    // Introduce random error to simulate difficulty
    if (Math.random() < diffSettings.errorRate) {
      // If there's "error" in decision, make random move or maintain current
      const randomMove = Math.random();
      if (randomMove < 0.4) return 'up';
      if (randomMove < 0.8) return 'down';
      return 'stop';
    }
    
    // Check if ball is coming towards us
    const isComingTowardsUs = (playerNumber === 1 && ball.velocity.x < 0) || 
                              (playerNumber === 2 && ball.velocity.x > 0);

    const paddleCenter = paddle.y + paddle.height / 2;
    const targetY = ball.y + ball.size / 2;
    
    // If ball is coming towards us, try to intercept it
    if (isComingTowardsUs) {
      // Predict where the ball will hit
      const predictedY = this.predictBallPosition(gameState, playerNumber);
      
      // Determine which direction to move paddle
      const offset = diffSettings.paddleCenterOffset * paddle.height; // Intentional deviation to simulate imprecision
      
      if (paddleCenter < predictedY - offset) {
        return 'down'; // Move down
      } else if (paddleCenter > predictedY + offset) {
        return 'up'; // Move up
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
  
  /**
   * Predict where the ball will hit based on current trajectory
   * @param {Object} gameState - Current game state
   * @param {number} playerNumber - Player number (1 or 2)
   * @returns {number} - Predicted Y position for impact
   */
  predictBallPosition(gameState, playerNumber) {
    const { ball, paddles, dimensions } = gameState;
    const paddle = paddles[playerNumber - 1];
    
    // X position of player's side
    const targetX = playerNumber === 1 ? paddle.width : dimensions.width - paddle.width;
    
    // Calculate how long it will take to reach player's side
    const distX = Math.abs(targetX - ball.x);
    const timeToImpact = distX / Math.abs(ball.velocity.x);
    
    // Predict Y position based on velocity and time
    let predictedY = ball.y + ball.velocity.y * timeToImpact;
    
    // Adjust for bounces off top and bottom walls
    const bounces = Math.floor(predictedY / dimensions.height);
    if (bounces % 2 === 0) {
      predictedY = predictedY % dimensions.height;
    } else {
      predictedY = dimensions.height - (predictedY % dimensions.height);
    }
    
    return predictedY;
  }
  
  /**
   * Send a move to the game service
   * @param {string} gameId - Game ID
   * @param {number} playerNumber - Player number
   * @param {string} direction - Direction ('up', 'down', or 'stop')
   */
  async sendMove(gameId, playerNumber, direction) {
    try {
      console.log(`Sending move for game ${gameId}: player=${playerNumber}, direction=${direction}`);
      console.log(`POST request to ${this.gameServiceUrl}/${gameId}/move`);
      
      const response = await axios.post(`${this.gameServiceUrl}/${gameId}/move`, {
        player: playerNumber,
        direction,
        fromAI: true // Indicar que este movimiento viene de la IA
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000
      });
      
      console.log(`Move response for game ${gameId}: status=${response.status}, success=${response.data.success}`);
      
      return response.status === 200 && response.data.success;
    } catch (error) {
      console.error(`Error sending move for game ${gameId}: ${error.message}`);
      if (error.response) {
        console.error(`Response error sending move for ${gameId}: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }
  
  /**
   * End a game and release associated resources
   * @param {string} gameId - Game ID
   */
  endGame(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) return;
    
    // Clean up interval
    if (gameData.intervalId) {
      clearInterval(gameData.intervalId);
    }
    
    // Remove from active games map
    this.activeGames.delete(gameId);
    console.log(`Game ${gameId} ended and resources released`);
  }
  
  /**
   * Get list of active games
   * @returns {Object[]} List of active game data
   */
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

// Create a singleton instance
const aiController = new AIController();

/**
 * Fastify Plugin for AI DeepPong Controller
 */
async function aiControllerPlugin(fastify, options) {
  // Make AI controller available for routes
  fastify.decorate('ai', aiController);
  
  // Register hook to clean up resources on close
  fastify.addHook('onClose', (instance, done) => {
    // Clear all game intervals
    aiController.activeGames.forEach((gameData, gameId) => {
      if (gameData.intervalId) {
        clearInterval(gameData.intervalId);
      }
    });
    done();
  });
}

// Export both the plugin and the singleton instance
module.exports = fp(aiControllerPlugin);
module.exports.aiController = aiController;