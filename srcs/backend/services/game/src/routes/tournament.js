"use strict";

const schemas = require('../schemas');
const tournamentManager = require('../plugins/tournament-manager');
const gameManager = require('../plugins/game-manager');

async function routes(fastify, options) {

  // Create a tournament
  fastify.post('/tournament/create', { schema: schemas.createTournament }, async (request, reply) => {
    try {
      const { players, settings } = request.body;      
      const playerConflicts = players.filter(playerName => gameManager.isPlayerInGame(playerName));
      
      if (playerConflicts.length > 0) {
        reply.code(409);
        return { 
          success: false, 
          message: `Players already in game: ${playerConflicts.join(', ')}` 
        };
      }
      
      // Create tournament
      const tournament = tournamentManager.createTournament(players, settings);
      
      // Prepare match creation with proper game settings
      const firstMatchSettings = {
        ballSpeed: settings.ballSpeed || fastify.config.game.defaults.ballSpeed,
        winningScore: settings.winningScore || fastify.config.game.defaults.winningScore,
        accelerationEnabled: settings.accelerationEnabled || fastify.config.game.defaults.accelerationEnabled,
        paddleSize: settings.paddleSize || fastify.config.game.defaults.paddleSize
      };

      // Create the first match (semifinal 1)
      const firstMatchId = tournament.firstMatchId;
      const matchDetails = tournamentManager.getMatchDetails(firstMatchId);
      
      // Create game for the first match
      const gameId = gameManager.createGame(firstMatchSettings);
      gameManager.addPlayer(gameId, matchDetails.player1, 1);
      gameManager.addPlayer(gameId, matchDetails.player2, 2);

      // Update match with gameId
      tournamentManager.updateMatchGameId(firstMatchId, gameId);
      
      return {
        success: true,
        tournamentId: tournament.tournamentId,
        firstMatchId: tournament.firstMatchId,
        firstMatchGameId: gameId,
        semifinal2Id: tournament.semifinal2Id,
        finalId: tournament.finalId,
        settings: tournament.settings,
        players: tournament.players
      };
    } catch (error) { 
      reply.code(500);
      console.error(error);
      return { 
        success: false, 
        message: error.message 
      };
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

    return { success: true, message: 'Tournament cancelled successfully' };
  });
}

module.exports = routes;