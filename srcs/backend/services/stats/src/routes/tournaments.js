"use strict";

const fp = require('fastify-plugin');

async function tournamentRoutes(fastify, options) {
  const { tournamentModel } = fastify;

  // Get all tournaments with pagination
  fastify.get('/tournaments', {
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
      const limit = parseInt(request.query.limit) || 100;
      const offset = parseInt(request.query.offset) || 0;
      
      const tournaments = tournamentModel.getAllTournaments(limit, offset);
      
      return {
        data: tournaments,
        pagination: {
          limit,
          offset,
          total: fastify.db.prepare('SELECT COUNT(*) as count FROM tournaments').get().count
        }
      };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get tournaments' });
    }
  });

  // Create a new tournament
  fastify.post('/tournaments', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'start_time', 'settings'],
        properties: {
          name: { type: 'string' },
          start_time: { type: 'string', format: 'date-time' },
          settings: { 
            type: 'object',
            additionalProperties: true
          },
          players: {
            type: 'array',
            items: {
              type: 'object',
              required: ['user_id'],
              properties: {
                user_id: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tournament = tournamentModel.createTournament(request.body);
      return reply.code(201).send(tournament);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to create tournament' });
    }
  });

  // Get tournaments by user ID (IMPORTANT: this must come BEFORE the /:id route)
  fastify.get('/tournaments/user/:userId', {
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
      const tournaments = tournamentModel.getTournamentsByUser(request.params.userId);
      return { data: tournaments };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get user tournaments' });
    }
  });

  // Get a specific tournament by ID (IMPORTANT: this must come AFTER more specific routes)
  fastify.get('/tournaments/:id', {
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
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }
      
      const tournament = tournamentModel.getTournamentById(id);
      
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }
      
      return tournament;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get tournament' });
    }
  });

  // Update a tournament
  fastify.patch('/tournaments/:id', {
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
          name: { type: 'string' },
          end_time: { type: 'string', format: 'date-time' },
          settings: { 
            type: 'object',
            additionalProperties: true
          },
          status: { 
            type: 'string', 
            enum: ['pending', 'in_progress', 'completed', 'cancelled'] 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }
      
      const success = tournamentModel.updateTournament(id, request.body);
      
      if (!success) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update tournament' });
    }
  });

  // Delete a tournament
  fastify.delete('/tournaments/:id', {
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
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }
      
      const success = tournamentModel.deleteTournament(id);
      
      if (!success) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete tournament' });
    }
  });

  // Add a player to a tournament
  fastify.post('/tournaments/:id/players', {
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
        required: ['user_id'],
        properties: {
          user_id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }
      
      const tournament = tournamentModel.getTournamentById(id);
      
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }
      
      if (tournament.status !== 'pending') {
        return reply.code(400).send({ error: 'Cannot add players to an active or completed tournament' });
      }
      
      const success = tournamentModel.addPlayerToTournament(id, request.body.user_id);
      
      if (!success) {
        return reply.code(400).send({ error: 'Failed to add player to tournament' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to add player to tournament' });
    }
  });

  // Update tournament results
  fastify.post('/tournaments/:id/results', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'array',
        items: {
          type: 'object',
          required: ['user_id', 'position'],
          properties: {
            user_id: { type: 'string' },
            position: { type: 'integer', minimum: 1 }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }
      
      // Ensure positions are integers
      const results = request.body.map(result => ({
        ...result,
        position: parseInt(result.position)
      }));
      
      const tournament = tournamentModel.getTournamentById(id);
      
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }
      
      const success = tournamentModel.updateTournamentResults(id, results);
      
      if (!success) {
        return reply.code(400).send({ error: 'Failed to update tournament results' });
      }
      
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update tournament results' });
    }
  });
}

module.exports = fp(tournamentRoutes, {
  name: 'tournament-routes',
  dependencies: ['tournament-model']
});