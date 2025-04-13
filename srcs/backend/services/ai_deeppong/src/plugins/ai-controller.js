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
        console.log(response.data)
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
  
  async sendMove(gameId, playerNumber, direction) {
    try {
      console.log(`Sending move for game ${gameId}: player=${playerNumber}, direction=${direction}`);
      
      const response = await axios.post(`${this.gameServiceUrl}/${gameId}/move`, {
        player: playerNumber,
        direction
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000
      });
      
      console.log(`Move response for game ${gameId}: status=${response.status}, success=${response.data.success}`);
      
      return response.status === 200 && response.data.success;
    } catch (error) {
      console.error(`Error sending move for game ${gameId}: ${error.message}`);
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
