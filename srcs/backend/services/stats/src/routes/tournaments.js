"use strict";

const fp = require('fastify-plugin');

async function tournamentRoutes(fastify, options) {
  const { tournamentModel } = fastify;

  // CREATE
  fastify.post('/tournaments', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'start_time', 'settings', 'players'],
        properties: {
          name: { type: 'string' },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
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
          },
          games: {
            type: 'array',
            items: {
              type: 'object',
              required: ['start_time', 'end_time', 'settings', 'players'],
              properties: {
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
          },
          results: {
            type: 'array',
            items: {
              type: 'object',
              required: ['user_id', 'position'],
              properties: {
                user_id: { type: 'string' },
                position: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        name, 
        start_time, 
        end_time, 
        settings, 
        players, 
        games, 
        results 
      } = request.body;

      // Validate input
      if (!players || players.length === 0) {
        return reply.code(400).send({ error: 'At least one player is required' });
      }

      // Create tournament
      const tournamentData = {
        name,
        start_time,
        settings,
        players
      };
      const tournament = tournamentModel.createTournament(tournamentData);

      // Add games to the tournament if provided
      if (games && games.length > 0) {
        const createdGames = games.map(gameData => {
          // Add tournament_id to each game
          const fullGameData = {
            ...gameData,
            tournament_id: tournament.id
          };
          return fastify.gameModel.createGame(fullGameData);
        });
        tournament.games = createdGames;
      }

      // Update tournament results if provided
      if (results && results.length > 0) {
        const updatedResults = await tournamentModel.updateTournamentResults(
          tournament.id, 
          results
        );
        tournament.results = updatedResults;
      }

      // If end_time is provided, update tournament 
      if (end_time) {
        tournamentModel.updateTournament(tournament.id, { 
          end_time, 
          status: 'completed' 
        });
      }

      return reply.code(201).send(tournament);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create tournament', details: err.message });
    }
  });

  // GET BY ID
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

module.exports = fp(tournamentRoutes, { name: 'tournament-routes', dependencies: ['tournament-model'] });
