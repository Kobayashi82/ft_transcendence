"use strict";

const schemas = require('../schemas');
const gameManager = require('../plugins/game-manager');

async function routes(fastify, options) {

  // OPTIONS
  fastify.get('/options', { schema: schemas.gameOptions }, async (request, reply) => {
    return {
      ballSpeed: ['slow', 'medium', 'fast'],
      paddleSize: ['short', 'medium', 'long'],
      winningScore: { min: 1, max: 20 },
      accelerationEnabled: [true, false],
      default: fastify.config.game.defaults
    };
  });

  // CREATE
  fastify.post('/create', { schema: schemas.createGame }, async (request, reply) => {
    const { player1Name, player2Name, isPlayer1AI, isPlayer2AI } = request.body;

    // Validate players
    let message = null;
    const isPlayer1InGame = !isPlayer1AI && gameManager.isPlayerInGame(player1Name);
    const isPlayer2InGame = !isPlayer2AI && gameManager.isPlayerInGame(player2Name);  

    if (player1Name === player2Name && !isPlayer1AI) message = 'Players with same name'
    else if (isPlayer1InGame && isPlayer2InGame) message = 'Both players are already in a game' 
    else if (isPlayer1InGame) message = `Player ${player1Name} is already in a game` 
    else if (isPlayer2InGame) message = `Player ${player2Name} is already in a game`

    if (message) {
      reply.code(409);
      return { success: false, message: message }
    }

    // Set options
    const options = {
      ballSpeed: request.body.ballSpeed || fastify.config.game.defaults.ballSpeed,
      winningScore: request.body.winningScore || fastify.config.game.defaults.winningScore,
      accelerationEnabled: request.body.accelerationEnabled || fastify.config.game.defaults.accelerationEnabled,
      paddleSize: request.body.paddleSize || fastify.config.game.defaults.paddleSize
    }

    // Create game
    const gameId = gameManager.createGame(options);
    gameManager.addPlayer(gameId, player1Name, 1);
    gameManager.addPlayer(gameId, player2Name, 2);

    return { success: true, gameId, options };
  });
  
  // START
  fastify.post('/:gameId/start', { schema: schemas.gameAction }, async (request, reply) => {
    const { gameId } = request.params;
    
    if (!gameManager.getGame(gameId)) {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
    
    const success = gameManager.startGame(gameId);
    return { success, message: success ? 'Game started successfully' : 'Unable to start game' };
  });
  
  // PAUSE
  fastify.post('/:gameId/pause', { schema: schemas.gameAction }, async (request, reply) => {
    const { gameId } = request.params;
    
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
    
    const success = gameManager.pauseGame(gameId);
    return { success, message: success ? 'Game paused successfully' : 'Unable to pause game' };
  });
  
  // RESUME
  fastify.post('/:gameId/resume', { schema: schemas.gameAction }, async (request, reply) => {
    const { gameId } = request.params;
    
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
    
    const success = gameManager.resumeGame(gameId);
    return { success, message: success ? 'Game resumed successfully' : 'Unable to resume game' };
  });
  
  // CANCEL
  fastify.post('/:gameId/cancel', { schema: schemas.gameAction }, async (request, reply) => {
    const { gameId } = request.params;
    
    const game = gameManager.getGame(gameId);
    if (!game) {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
    
    const success = gameManager.cancelGame(gameId);
    return { success, message: success ? 'Game cancelled successfully' : 'Unable to cancel game' };
  });
  
  // PADDLE MOVE
  fastify.post('/:gameId/move', { schema: schemas.playerMove }, async (request, reply) => {
    const { gameId } = request.params;
    const { player, direction } = request.body;
    
    // Convert 'stop' to null
    const movementDirection = direction === 'stop' ? null : direction;   
    const success = gameManager.handlePaddleMove(gameId, player, movementDirection);
    
    if (success) {
      return { success: true, message: 'Movement processed successfully' };
    } else {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
  });
  
  // PADDLE POSTITION
  fastify.post('/:gameId/position', { schema: schemas.paddlePosition }, async (request, reply) => {
    const { gameId } = request.params;
    const { player, y } = request.body;
    
    const success = gameManager.setPaddlePosition(gameId, player, y);
    
    if (success) {
      return { success: true, mesaddPlayeraddPlayersage: 'Position updated successfully' };
    } else {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
  });

  // STATE
  fastify.get('/:gameId', { schema: schemas.getGame }, async (request, reply) => {
    const { gameId } = request.params;
    const gameState = gameManager.getGameState(gameId);
    
    if (gameState) {
      return { success: true, gameState };
    } else {
      reply.code(404);
      return { success: false, message: 'Game not found' };
    }
  });
}

module.exports = routes;
