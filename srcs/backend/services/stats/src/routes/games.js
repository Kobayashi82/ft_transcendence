"use strict";

const fp = require('fastify-plugin');

async function gameRoutes(fastify, options) {
  const { gameModel } = fastify;

  // Get all games with pagination
  fastify.get('/games', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 100 },
          offset: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Convert query params to integers
      const limit = parseInt(request.query.limit) || 100;
      const offset = parseInt(request.query.offset) || 0;
      
      const games = gameModel.getAllGames(limit, offset);
      
      return {
        data: games,
        pagination: {
          limit,
          offset,
          total: fastify.db.prepare('SELECT COUNT(*) as count FROM games').get().count
        }
      };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get games' });
    }
  });

  // Create a new game
  fastify.post('/games', {
    schema: {
      body: {
        type: 'object',
        required: ['start_time', 'end_time', 'settings', 'players'],
        properties: {
          tournament_id: { type: ['integer', 'null'] },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
          settings: { 
            type: 'object',
            additionalProperties: true
          },
          players: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['user_id', 'score'],
              properties: {
                user_id: { type: 'string' },
                score: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Ensure settings is an object (not a string)
      const requestBody = { ...request.body };
      
      // Convert tournament_id to integer if provided
      if (requestBody.tournament_id) {
        requestBody.tournament_id = parseInt(requestBody.tournament_id);
      }
      
      // Ensure player scores are integers
      if (requestBody.players) {
        requestBody.players = requestBody.players.map(player => ({
          ...player,
          score: parseInt(player.score)
        }));
      }
      
      const game = gameModel.createGame(requestBody);
      return reply.code(201).send(game);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to create game' });
    }
  });

  // Get games by user ID (IMPORTANT: this must come BEFORE the /:id route)
  fastify.get('/games/user/:userId', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const games = gameModel.getGamesByUser(request.params.userId.toLowerCase().trim());
      return { data: games };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get user games' });
    }
  });

  // Get a specific game by ID (IMPORTANT: this must come AFTER more specific routes)
  fastify.get('/games/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Convert id to integer
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid game ID' });
      }
      
      const game = gameModel.getGameById(id);
      
      if (!game) {
        return reply.code(404).send({ error: 'Game not found' });
      }
      
      return game;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get game' });
    }
  });

  // Update a game
  fastify.patch('/games/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          tournament_id: { type: ['integer', 'null'] },
          end_time: { type: 'string', format: 'date-time' },
          settings: { 
            type: 'object',
            additionalProperties: true
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Convert id to integer
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid game ID' });
      }
      
      // Process request body
      const requestBody = { ...request.body };
      
      // Convert tournament_id to integer if provided
      if (requestBody.tournament_id) {
        requestBody.tournament_id = parseInt(requestBody.tournament_id);
      }
      
      const success = gameModel.updateGame(id, requestBody);
      
      if (!success) {
        return reply.code(404).send({ error: 'Game not found' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update game' });
    }
  });

  // Delete a game
  fastify.delete('/games/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Convert id to integer
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid game ID' });
      }
      
      const success = gameModel.deleteGame(id);
      
      if (!success) {
        return reply.code(404).send({ error: 'Game not found' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete game' });
    }
  });
}

module.exports = fp(gameRoutes, {
  name: 'game-routes',
  dependencies: ['game-model']
});