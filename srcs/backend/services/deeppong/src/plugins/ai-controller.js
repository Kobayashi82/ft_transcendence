"use strict";

const axios = require('axios');
const config = require('../config');
const fp = require('fastify-plugin');

class AIController {

  constructor() {
    this.activeGames = new Map();
    this.gameServiceUrl = config.services.game.url;
  }

  async joinGame(gameId, playerNumber, aiName, difficulty) {    
    try {
      const gameKey = `${gameId}_${playerNumber}`;
      if (this.activeGames.has(gameKey)) return true;

      const gameData = {
        gameId,
        playerNumber,
        aiName,
        difficulty: difficulty,
        lastDirection: null,
        gameState: null,
        intervalId: null,
        moveIntervalId: null,
        lastMoveTime: null,
        continuousMovementDuration: 0, 
        lastGameState: null 
      }

      this.activeGames.set(gameKey, gameData);      
      this.startGameLoop(gameKey);
      return true;
    } catch (error) { throw error; }
  }

  async getGameState(gameId) {
    try {     
      const response = await axios.get(`${this.gameServiceUrl}/${gameId}`, { timeout: 2000 });

      if (response.status === 200 && response.data.success) return response.data.gameState;
      return null;
    } catch (error) { return null; }
  }

  startGameLoop(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData) return;
    const { gameId } = gameData;

    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);

    gameData.lastDirection = null;
    gameData.ballVelocity = null;
    gameData.pendingStopTime = null;
    gameData.previousBall = null;
    gameData.previousTime = null;
    gameData.continuousMovementDuration = 0;
    gameData.lastGameState = null;
    gameData.lastMoveTime = Date.now();
    gameData.paddleSpeed = 305;

    let failureCount = 0;
    const MAX_FAILURES = 3;

    gameData.intervalId = setInterval(async () => {
      try {
        const gameState = await this.getGameState(gameId);

        if (!gameState) {
          failureCount++;
          if (failureCount >= MAX_FAILURES) this.endGame(gameKey);
          return;
        }

        failureCount = 0;

        if (gameState.gameState === 'finished' || gameState.gameState === 'cancelled') { this.endGame(gameKey); return; }
        if (gameData.lastGameState && gameData.lastGameState !== gameState.gameState) {
          if (gameState.gameState !== 'playing' && gameData.lastDirection !== 'stop') {
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
          }
        }
        gameData.gameState = gameState;
        gameData.lastGameState = gameState.gameState;
        if (gameState.gameState !== 'playing') return;

        const now = Date.now();
        if (gameData.lastDirection !== 'stop' && gameData.lastDirection !== null) {
          gameData.continuousMovementDuration += (now - gameData.lastMoveTime);
          if (gameData.continuousMovementDuration > 3000) {
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else gameData.continuousMovementDuration = 0;

        gameData.lastMoveTime = now;

        if (gameData.previousBall && gameData.previousTime && gameState.ball) {
          const timeDelta = (now - gameData.previousTime) / 1000;
          if (timeDelta > 0) {
            const ballVelX = (gameState.ball.x - gameData.previousBall.x) / timeDelta;
            const ballVelY = (gameState.ball.y - gameData.previousBall.y) / timeDelta;
            gameData.ballVelocity = { x: ballVelX, y: ballVelY }
          }
        }

        if (gameState.ball) {
          gameData.previousBall = { x: gameState.ball.x, y: gameState.ball.y }
          gameData.previousTime = now;
        }
        this.handleMovement(gameKey);
      } catch (error) {
        failureCount++;       
        if (failureCount >= MAX_FAILURES) this.endGame(gameKey);
      }
    }, config.AI_update / 10);

    gameData.moveIntervalId = setInterval(async () => {
      try {
        if (!gameData.gameState || gameData.gameState.gameState !== 'playing') return;
        const now = Date.now();
        if (gameData.pendingStopTime) {
          if (now >= gameData.pendingStopTime) {
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
          }
        }

        if (gameData.lastMoveTime && gameData.lastDirection !== 'stop' && (now - gameData.lastMoveTime > 2500)) {
          await this.sendMove(gameId, gameData.playerNumber, 'stop');
          gameData.lastDirection = 'stop';
          gameData.pendingStopTime = null;
          gameData.continuousMovementDuration = 0;
        }
      } catch (error) {}
    }, 50);
  }

  handleMovement(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData || !gameData.gameState) return;
    
    const { gameId, gameState, playerNumber, difficulty } = gameData;
    if (gameState.gameState !== 'playing') return;
    if (!gameState.ball) return;

    const now = Date.now();
    gameData.lastMoveTime = now;

    const myPlayer = playerNumber === 1 ? gameState.player1 : gameState.player2;
    if (!myPlayer) return;

    const paddleY = myPlayer.y;
    const paddleHeight = gameState.config.paddleHeight;
    const paddleCenter = paddleY + paddleHeight / 2;
    const targetPosition = this.calculateTargetPosition(gameKey);
    if (targetPosition === null) return;

    const distanceToTarget = targetPosition - paddleCenter;

    let threshold;
    switch (difficulty) {
      case 'hard':    threshold = 25; break;
      case 'medium':  threshold = 35; break;
      case 'easy':    threshold = 45; break;
      default:        threshold = 45;
    }

    if (gameData.lastDirection === 'stop') threshold *= 1.5;
    if (!gameData.directionHistory) {
      gameData.directionHistory = [];
      gameData.lastDirectionChangeTime = 0;
      gameData.stablePositionCount = 0;
    }
    const minDirectionTime = 100;
    const timeSinceLastDirectionChange = now - gameData.lastDirectionChangeTime;
    const canChangeDirection = timeSinceLastDirectionChange > minDirectionTime;

    if (Math.abs(distanceToTarget) <= threshold) {
      if (gameData.lastDirection !== 'stop') {
        this.sendMove(gameId, playerNumber, 'stop');
        gameData.lastDirection = 'stop';
        gameData.pendingStopTime = null;
        gameData.continuousMovementDuration = 0;
        gameData.stablePositionCount = 0;
      } else {
        gameData.stablePositionCount++;
        if (gameData.stablePositionCount > 3) threshold *= 1.5;
      }
      return;
    }
    
    const direction = distanceToTarget > 0 ? 'down' : 'up';
    gameData.directionHistory.unshift(direction);
    if (gameData.directionHistory.length > 5) gameData.directionHistory.pop();
    if (gameData.directionHistory.length >= 3) {
      const pattern = gameData.directionHistory.slice(0, 3).join('');
      if (pattern === 'updownup' || pattern === 'downupdown') {
        this.sendMove(gameId, playerNumber, 'stop');
        gameData.lastDirection = 'stop';
        gameData.pendingStopTime = null;
        gameData.directionHistory = [];
        gameData.lastDirectionChangeTime = now;
        gameData.continuousMovementDuration = 0;
        gameData.stablePositionCount = 0;
        return;
      }
    }

    if (!canChangeDirection && gameData.lastDirection !== 'stop' && gameData.lastDirection !== direction) return;
    if (gameData.pendingStopTime !== null) {
      if (gameData.lastDirection !== direction && canChangeDirection) {
        gameData.pendingStopTime = null;
        gameData.lastDirectionChangeTime = now;
      } else {
        const currentTimeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000;
        const projectedStopTime = now + currentTimeToTarget;

        if (Math.abs(projectedStopTime - gameData.pendingStopTime) > 100) gameData.pendingStopTime = projectedStopTime;
        return;
      }
    }

    if (direction === gameData.lastDirection && gameData.lastDirection !== 'stop') {
      const currentTimeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000;
      const maxMoveTime = 2000;
      const timeToStop = Math.min(currentTimeToTarget, maxMoveTime);

      gameData.pendingStopTime = now + timeToStop;
      return;
    }
    
    if (gameData.lastDirection !== 'stop' && gameData.lastDirection !== direction && Math.abs(distanceToTarget) < threshold * 2) {
      this.sendMove(gameId, playerNumber, 'stop');
      gameData.lastDirection = 'stop';
      gameData.pendingStopTime = null;
      gameData.lastDirectionChangeTime = now;
      gameData.stablePositionCount = 0;      
      return;
    }

    let correctionFactor;
    switch (difficulty) {
      case 'hard':    correctionFactor = 1.0;  break;
      case 'medium':  correctionFactor = 0.98; break;
      case 'easy':    correctionFactor = 0.95; break;
      default:        correctionFactor = 0.98;
    }
    
    const timeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000 * correctionFactor;

    let stopTime;
    if (Math.abs(distanceToTarget) < threshold * 3) {
      stopTime = now + Math.min(timeToTarget, 100);
    } else if (timeToTarget > (config.AI_update / 10) * 2) {
      stopTime = now + Math.min(2000, (config.AI_update / 10) * 2);
    } else {
      stopTime = now + timeToTarget;
    }

    this.sendMove(gameId, playerNumber, direction);
    gameData.lastDirection = direction;
    gameData.pendingStopTime = stopTime;
    gameData.lastDirectionChangeTime = now;
    gameData.stablePositionCount = 0;
    gameData.continuousMovementDuration = 0;
  }
  
  calculateTargetPosition(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData || !gameData.gameState) return null;
    const { gameState, playerNumber, difficulty } = gameData;
    const ball = gameState.ball;
    const config = gameState.config;
    
    if (!ball || !config) return null;

    const gameWidth = config.width;
    const gameHeight = config.height;
    
    if (!gameData.ballVelocity) return gameHeight / 2;

    const ballVelX = gameData.ballVelocity.x;
    const isComingTowardsUs = (playerNumber === 1 && ballVelX < 0) || (playerNumber === 2 && ballVelX > 0);

    if (!isComingTowardsUs) {
      const myPlayer = playerNumber === 1 ? gameState.player1 : gameState.player2;
      if (!myPlayer) return gameHeight / 2;
      
      const paddleY = myPlayer.y;
      const paddleHeight = gameState.config.paddleHeight;
      const paddleCenter = paddleY + paddleHeight / 2;

      return paddleCenter;
    }

    const paddleX = playerNumber === 1 ? config.paddleWidth : gameWidth - config.paddleWidth;
    const distX = Math.abs(paddleX - ball.x);
    const timeToImpact = Math.abs(distX / ballVelX);

    let predictionAccuracy;
    switch (difficulty) {
      case 'hard':   predictionAccuracy = 1.0;  break;
      case 'medium': predictionAccuracy = 0.99; break;
      case 'easy':   predictionAccuracy = 0.96; break;
      default:       predictionAccuracy = 0.99;
    }

    const correctedVelY = gameData.ballVelocity.y * predictionAccuracy;

    let predictedY = ball.y;
    let remainingTime = timeToImpact;
    let currentVelY = correctedVelY;
    let maxBounces = 10;
    let bounceCount = 0;

    while (remainingTime > 0 && bounceCount < maxBounces) {
      let timeToTopBound = currentVelY < 0 ? -predictedY / currentVelY : Infinity;
      let timeToBottomBound = currentVelY > 0 ? (gameHeight - predictedY) / currentVelY : Infinity;
      let timeToNextBounce = Math.min(timeToTopBound, timeToBottomBound);

      if (timeToNextBounce >= remainingTime) { predictedY += currentVelY * remainingTime; break; }

      let energyLoss = 0;
      switch (difficulty) {
        case 'hard':   energyLoss = 0;     break;
        case 'medium': energyLoss = 0.002; break;
        case 'easy':   energyLoss = 0.005; break;
        default:       energyLoss = 0.002;
      }
      
      predictedY += currentVelY * timeToNextBounce;
      currentVelY = -currentVelY * (1 - energyLoss);
      if (Math.abs(predictedY) < 0.001) predictedY = 0.001;
      if (Math.abs(predictedY - gameHeight) < 0.001) predictedY = gameHeight - 0.001;
      remainingTime -= timeToNextBounce;
      bounceCount++;
    }
    
    if (difficulty !== 'hard') {
      const randomRange = { 'easy': 12, 'medium': 6 }[difficulty] || 0;
      if (randomRange > 0) {
        const randomOffset = (Math.random() + Math.random() - 1) * randomRange;
        predictedY += randomOffset;
      }
    }
    
    const paddleHeight = config.paddleHeight;
    const paddleHalfHeight = paddleHeight / 2;
    
    predictedY = Math.max(paddleHalfHeight, Math.min(gameHeight - paddleHalfHeight, predictedY));
    gameData.lastTargetPosition = predictedY;
    
    return predictedY;
  }

  async sendMove(gameId, playerNumber, direction) {
    try {      
      if (!direction) return false;
      if (!this.gameServiceUrl) return false;
      
      const moveUrl = `${this.gameServiceUrl}/${gameId}/move`;
      const moveData = { player: playerNumber, direction }
      const response = await axios.post(moveUrl, moveData, { headers: { 'Content-Type': 'application/json' }, timeout: 2000 });

      return (response.status === 200 && response.data.success);
    } catch (error) { return false; }
  }

  endGame(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData) return;
    
    const { gameId, playerNumber } = gameData;
    
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    if (gameData.lastDirection !== 'stop') this.sendMove(gameId, playerNumber, 'stop');
    
    this.activeGames.delete(gameKey);
  }
  
  getActiveGames() {
    const games = [];
    this.activeGames.forEach((data, gameKey) => {
      games.push({
        gameId: data.gameId,
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

async function aiControllerPlugin(fastify) {

  fastify.decorate('ai', aiController);
  fastify.addHook('onClose', (_, done) => {
    aiController.activeGames.forEach((gameData) => {
      if (gameData.intervalId) clearInterval(gameData.intervalId);
      if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    });
    done();
  });

}

module.exports = fp(aiControllerPlugin);
module.exports.aiController = aiController;
