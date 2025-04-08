"use strict";

const gameManager = require('../plugins/game-manager');
const { v4: uuidv4 } = require('uuid');

// Tournament schemas
const schemas = {
  // Schema for creating a tournament
  createTournament: {
    body: {
      type: 'object',
      properties: {
        players: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 4,
          maxItems: 4
        },
        settings: {
          type: 'object',
          properties: {
            ballSpeed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
            winningScore: { type: 'integer', minimum: 1, maximum: 20 },
            accelerationEnabled: { type: 'boolean' },
            paddleSize: { type: 'string', enum: ['short', 'medium', 'long'] }
          }
        }
      },
      required: ['players', 'settings']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          tournamentId: { type: 'string' },
          firstMatchId: { type: 'string' },
          semifinal2Id: { type: 'string' },
          settings: { type: 'object' }
        }
      },
      409: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },
  
  // Schema for cancelling a tournament
  cancelTournament: {
    params: {
      type: 'object',
      properties: {
        tournamentId: { type: 'string' }
      },
      required: ['tournamentId']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      404: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  }
};

// Tournament management
class TournamentManager {
  constructor() {
    this.tournaments = new Map();
    this.matches = new Map();
  }
  
  // Create a tournament with 4 players
  createTournament(players, settings) {
    // Validate players
    if (players.length !== 4) {
      throw new Error('Tournament requires exactly 4 players');
    }
    
    const tournamentId = uuidv4();
    
    // Create tournament structure
    const tournament = {
      id: tournamentId,
      createdAt: new Date(),
      settings: settings,
      players: players,
      matches: [] // Will hold match IDs
    };
    
    // Create semifinals
    const semifinal1Id = this.createMatch(tournamentId, 1, players[0], players[1], settings);
    const semifinal2Id = this.createMatch(tournamentId, 1, players[2], players[3], settings);
    
    // Create final match (players will be set by the backend when semifinals complete)
    const finalId = uuidv4();
    
    // Store match IDs in tournament
    tournament.matches.push(semifinal1Id);
    tournament.matches.push(semifinal2Id);
    tournament.matches.push(finalId);
    
    // Store additional info in matches
    this.matches.set(semifinal1Id, {
      tournamentId,
      round: 1,
      nextMatchId: finalId,
      player1Position: 1 // Will go to player1 in final
    });
    
    this.matches.set(semifinal2Id, {
      tournamentId,
      round: 1,
      nextMatchId: finalId,
      player1Position: 2 // Will go to player2 in final
    });
    
    // Store tournament
    this.tournaments.set(tournamentId, tournament);
    
    return {
      tournamentId,
      firstMatchId: semifinal1Id,
      semifinal2Id: semifinal2Id,
      finalId: finalId,
      settings
    };
  }
  
  // Create a match for the tournament
  createMatch(tournamentId, round, player1, player2, settings) {
    const matchId = uuidv4();
    
    // Create the actual game in the game manager
    const options = {
      ...settings,
      tournamentMode: true,
      tournamentRound: round
    };
    
    const gameId = gameManager.createGame(options);
    gameManager.addPlayer(gameId, player1, 1);
    gameManager.addPlayer(gameId, player2, 2);
    
    // Link the match ID and game ID
    this.matches.set(matchId, {
      gameId,
      tournamentId,
      round
    });
    
    // Update the game's settings with tournament info
    const game = gameManager.getGame(gameId);
    if (game) {
      game.tournamentMode = true;
      game.tournamentRound = round;
    }
    
    return matchId;
  }
  
  // Cancel a tournament
  cancelTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    
    // Cancel all active games
    for (const matchId of tournament.matches) {
      const match = this.matches.get(matchId);
      if (match && match.gameId) {
        // Cancel the game in game manager
        gameManager.cancelGame(match.gameId);
      }
    }
    
    // Remove tournament
    this.tournaments.delete(tournamentId);
    
    return true;
  }
  
  // Get match info
  getMatchInfo(matchId) {
    return this.matches.get(matchId);
  }
}

// Create singleton tournament manager
const tournamentManager = new TournamentManager();

// Define routes
async function routes(fastify, options) {
  // Create a tournament
  fastify.post('/tournament/create', { schema: schemas.createTournament }, async (request, reply) => {
    try {
      const { players, settings } = request.body;
      
      // Check for player conflicts
      const playerConflicts = players.filter(playerName => 
        gameManager.isPlayerInGame(playerName)
      );
      
      if (playerConflicts.length > 0) {
        reply.code(409);
        return { 
          success: false, 
          message: `Players already in game: ${playerConflicts.join(', ')}` 
        };
      }
      
      // Create tournament
      const tournament = tournamentManager.createTournament(players, settings);
      
      return {
        success: true,
        tournamentId: tournament.tournamentId,
        firstMatchId: tournament.firstMatchId,
        semifinal2Id: tournament.semifinal2Id,
        finalId: tournament.finalId,
        settings: tournament.settings
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, message: error.message };
    }
  });
  
  // Cancel a tournament
  fastify.post('/tournament/:tournamentId/cancel', { schema: schemas.cancelTournament }, async (request, reply) => {
    const { tournamentId } = request.params;
    
    const success = tournamentManager.cancelTournament(tournamentId);
    
    if (!success) {
      reply.code(404);
      return { success: false, message: 'Tournament not found' };
    }
    
    return { 
      success: true, 
      message: 'Tournament cancelled successfully' 
    };
  });
}

module.exports = routes;