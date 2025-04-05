"use strict";

const gameManager = require('../plugins/game-manager');
const schemas = require('../schemas');

async function routes(fastify, options) {
  // Get game configuration options
  fastify.get('/options', {
    schema: schemas.gameOptions
  }, async (request, reply) => {
    return {
      ballSpeed: ['slow', 'medium', 'fast'],
      paddleSize: ['short', 'medium', 'long'],
      winningScore: { min: 1, max: 20 },
      accelerationEnabled: [true, false]
    };
  });

  // Create a new game
  fastify.post('/', {
    schema: schemas.createGame
  }, async (request, reply) => {
    const playerName = request.body.playerName;
    
    // Check if player is already in another game
    if (gameManager.isPlayerInGame(playerName)) {
      reply.code(409);
      return {
        success: false,
        message: `Player "${playerName}" is already in another game`
      };
    }
    
    const options = {
      ballSpeed: request.body.ballSpeed || 'medium',
      winningScore: request.body.winningScore || 5,
      accelerationEnabled: request.body.accelerationEnabled || false,
      paddleSize: request.body.paddleSize || 'medium'
    };
    
    const gameId = gameManager.createGame(options);
    
    // Register player as player 1
    gameManager.addPlayer(gameId, playerName, 1);
    
    return {
      success: true,
      gameId,
      options
    };
  });
  
  // Join a game as player 2
  fastify.post('/:gameId/join', {
    schema: schemas.joinGame
  }, async (request, reply) => {
    const { gameId } = request.params;
    const playerName = request.body.playerName;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    // Check if player is already in another game
    if (gameManager.isPlayerInGame(playerName)) {
      const playerInfo = gameManager.players.get(playerName);
      
      // If player is trying to rejoin their game, allow it
      if (playerInfo && playerInfo.gameId === gameId) {
        return {
          success: true,
          gameId,
          player: playerInfo.playerNumber,
          gameState: gameManager.getGameState(gameId)
        };
      }
      
      reply.code(409);
      return {
        success: false,
        message: `Player "${playerName}" is already in another game`
      };
    }
    
    // Check if game is full
    if (gameManager.isGameFull(gameId)) {
      reply.code(400);
      return {
        success: false,
        message: 'Game is already full'
      };
    }
    
    // Determine player number (should be 2 if we got here)
    const playerNumber = !game.player1 ? 1 : 2;
    
    // Add player
    gameManager.addPlayer(gameId, playerName, playerNumber);
    
    return {
      success: true,
      gameId,
      player: playerNumber,
      gameState: gameManager.getGameState(gameId)
    };
  });
  
  // Join a game as spectator
  fastify.post('/:gameId/spectate', {
    schema: schemas.spectateGame
  }, async (request, reply) => {
    const { gameId } = request.params;
    const spectatorName = request.body.spectatorName || 'Anonymous';
    
    // Check if game exists
    const gameState = gameManager.getGameState(gameId);
    if (!gameState) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    // Register spectator
    gameManager.addSpectator(gameId, spectatorName);
    
    return {
      success: true,
      gameId,
      gameState
    };
  });
  
  // Start a game
  fastify.post('/:gameId/start', {
    schema: schemas.gameAction
  }, async (request, reply) => {
    const { gameId } = request.params;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    // Check if game has enough players
    if (!gameManager.hasEnoughPlayers(gameId)) {
      reply.code(400);
      return {
        success: false,
        message: 'Not enough players to start the game'
      };
    }
    
    const success = gameManager.startGame(gameId);
    
    return {
      success,
      message: success ? 'Game started successfully' : 'Unable to start game'
    };
  });
  
  // Pause a game
  fastify.post('/:gameId/pause', {
    schema: schemas.gameAction
  }, async (request, reply) => {
    const { gameId } = request.params;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    const success = gameManager.pauseGame(gameId);
    
    return {
      success,
      message: success ? 'Game paused successfully' : 'Unable to pause game'
    };
  });
  
  // Resume a paused game
  fastify.post('/:gameId/resume', {
    schema: schemas.gameAction
  }, async (request, reply) => {
    const { gameId } = request.params;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    const success = gameManager.resumeGame(gameId);
    
    return {
      success,
      message: success ? 'Game resumed successfully' : 'Unable to resume game'
    };
  });
  
  // Cancel a game
  fastify.post('/:gameId/cancel', {
    schema: schemas.gameAction
  }, async (request, reply) => {
    const { gameId } = request.params;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    const success = gameManager.cancelGame(gameId);
    
    return {
      success,
      message: success ? 'Game cancelled successfully' : 'Unable to cancel game'
    };
  });
  
  // Reset a game
  fastify.post('/:gameId/reset', {
    schema: schemas.gameAction
  }, async (request, reply) => {
    const { gameId } = request.params;
    
    // Check if game exists
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
    
    const success = gameManager.resetGame(gameId);
    
    return {
      success,
      message: success ? 'Game reset successfully' : 'Unable to reset game'
    };
  });
  
  // Get game state
  fastify.get('/:gameId', {
    schema: schemas.getGame
  }, async (request, reply) => {
    const { gameId } = request.params;
    const gameState = gameManager.getGameState(gameId);
    
    if (gameState) {
      return {
        success: true,
        gameState
      };
    } else {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
  });
  
  // Send player movement
  fastify.post('/:gameId/move', {
    schema: schemas.playerMove
  }, async (request, reply) => {
    const { gameId } = request.params;
    const { player, direction } = request.body;
    
    // Convert 'stop' to null for the game logic
    const movementDirection = direction === 'stop' ? null : direction;
    
    const success = gameManager.handlePlayerMovement(gameId, player, movementDirection);
    
    if (success) {
      return {
        success: true,
        message: 'Movement processed successfully'
      };
    } else {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
  });
  
  // Set paddle position directly
  fastify.post('/:gameId/position', {
    schema: schemas.paddlePosition
  }, async (request, reply) => {
    const { gameId } = request.params;
    const { player, y } = request.body;
    
    const success = gameManager.setPaddlePosition(gameId, player, y);
    
    if (success) {
      return {
        success: true,
        message: 'Position updated successfully'
      };
    } else {
      reply.code(404);
      return {
        success: false,
        message: 'Game not found'
      };
    }
  });
  
  // List active games
  fastify.get('/', {
    schema: schemas.listGames
  }, async (request, reply) => {
    const games = gameManager.listGames();
    
    return { 
      success: true,
      count: games.length,
      games 
    };
  });
}

module.exports = routes;