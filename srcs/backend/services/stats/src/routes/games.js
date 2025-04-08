"use strict";

const fp = require('fastify-plugin');

async function gameRoutes(fastify, options) {
  const { gameModel } = fastify;

  // CREATE
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
      if (requestBody.tournament_id) requestBody.tournament_id = parseInt(requestBody.tournament_id);
      
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

  // GET BY ID
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
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) return reply.code(400).send({ error: 'Invalid game ID' });
     
      const game = gameModel.getGameById(id);
      
      if (!game) return reply.code(404).send({ error: 'Game not found' });
      
      return game;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get game' });
    }
  });
}

module.exports = fp(gameRoutes, { name: 'game-routes', dependencies: ['game-model'] });
