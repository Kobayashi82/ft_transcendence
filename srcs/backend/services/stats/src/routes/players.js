"use strict";

const fp = require('fastify-plugin');

async function playerRoutes(fastify, options) {
  const { playerModel } = fastify;

  // Get all players
  fastify.get('/players', async (request, reply) => {
    try {
      const players = playerModel.getAllPlayers();
      return { data: players };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get players' });
    }
  });

  // Get or create a player
  fastify.post('/players', {
    schema: {
      body: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const player = playerModel.getOrCreatePlayer(request.body.user_id);
      return player;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to create player' });
    }
  });

  // Get player by user ID (IMPORTANT: this must come BEFORE the /:id route)
  fastify.get('/players/user/:userId', {
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
      const player = playerModel.getOrCreatePlayer(request.params.userId.toLowerCase().trim());
      return player;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get player by user ID' });
    }
  });

  // Get a specific player by ID
  fastify.get('/players/:id', {
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
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid player ID' });
      }
      
      const player = playerModel.getPlayerById(id);
      
      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }
      
      return player;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get player' });
    }
  });

  // Get games for a player
  fastify.get('/players/:id/games', {
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
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid player ID' });
      }
      
      const player = playerModel.getPlayerById(id);
      
      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }
      
      const games = playerModel.getPlayerGames(id);
      return { data: games };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get player games' });
    }
  });

  // Get tournaments for a player
  fastify.get('/players/:id/tournaments', {
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
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid player ID' });
      }
      
      const player = playerModel.getPlayerById(id);
      
      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }
      
      const tournaments = playerModel.getPlayerTournaments(id);
      return { data: tournaments };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get player tournaments' });
    }
  });

  // Get stats for a player
  fastify.get('/players/:id/stats', {
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
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid player ID' });
      }
      
      const player = playerModel.getPlayerById(id);
      
      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }
      
      const stats = playerModel.getPlayerStats(id);
      return stats;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get player stats' });
    }
  });
}

module.exports = fp(playerRoutes, {
  name: 'player-routes',
  dependencies: ['player-model']
});