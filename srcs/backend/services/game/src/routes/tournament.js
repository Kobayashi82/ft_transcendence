"use strict";

const schemas = require('../schemas');
const gameManager = require('../plugins/game-manager');
const tournamentManager = require('../plugins/tournament-manager');

async function routes(fastify) {

  // CREATE
  fastify.post('/tournament/create', { schema: schemas.createTournament }, async (request, reply) => {
    try {
      const { players, settings, name } = request.body;      
      const playerConflicts = players.filter(playerName => gameManager.isPlayerInGame(playerName));
      
      if (playerConflicts.length > 0) { reply.code(409); return { success: false, message: `Players already in game: ${playerConflicts.join(', ')}` }}
      
      const aiPlayers = players.filter(playerName => gameManager.isAIPlayer(playerName));
      if (aiPlayers.length > 0) { reply.code(400); return { success: false, message: `AI players are not allowed in tournaments: ${aiPlayers.join(', ')}` }}
      
      const tournamentName = name ? name.trim() : "";
      if (!tournamentName) { reply.code(400); return { success: false, message: "Tournament name is required" }}
      
      const tournament = tournamentManager.createTournament(players, settings, tournamentName);      
      const firstMatchSettings = {
        ballSpeed: settings.ballSpeed || fastify.config.game.defaults.ballSpeed,
        winningScore: settings.winningScore || fastify.config.game.defaults.winningScore,
        accelerationEnabled: settings.accelerationEnabled || fastify.config.game.defaults.accelerationEnabled,
        paddleSize: settings.paddleSize || fastify.config.game.defaults.paddleSize,
        tournamentMode: true,
        tournamentRound: 1,
        tournamentName: tournamentName
      }

      // Create the first match
      const firstMatchId = tournament.firstMatchId;
      const matchDetails = tournamentManager.getMatchDetails(firstMatchId);
      const gameId = gameManager.createGame(firstMatchSettings);
      gameManager.addPlayer(gameId, matchDetails.player1, 1);
      gameManager.addPlayer(gameId, matchDetails.player2, 2);
      tournamentManager.updateMatchGameId(firstMatchId, gameId);
      
      if (settings.useConfigForAllRounds) {
        tournamentManager.setTournamentSettings(tournament.tournamentId, {
          ballSpeed: settings.ballSpeed || fastify.config.game.defaults.ballSpeed,
          winningScore: settings.winningScore || fastify.config.game.defaults.winningScore,
          accelerationEnabled: settings.accelerationEnabled || fastify.config.game.defaults.accelerationEnabled,
          paddleSize: settings.paddleSize || fastify.config.game.defaults.paddleSize,
          tournamentName: tournamentName
        });
      }
      
      return {
        success: true,
        tournamentId: tournament.tournamentId,
        tournamentName: tournamentName,
        firstMatchId: tournament.firstMatchId,
        firstMatchGameId: gameId,
        semifinal2Id: tournament.semifinal2Id,
        finalId: tournament.finalId,
        settings: tournament.settings,
        players: tournament.players
      }
    } catch (error) {
      return reply.code(500).send({ success: false, message: error.message });
    }

  });
  
  // CANCEL
  fastify.post('/tournament/:tournamentId/cancel', { schema: schemas.cancelTournament }, async (request, reply) => {
    const { tournamentId } = request.params;
    const success = tournamentManager.cancelTournament(tournamentId);
    
    if (!success) { reply.code(404); return { success: false, message: 'Tournament not found' }}
    return { success: true, message: 'Tournament cancelled successfully' }
  });

}

module.exports = routes;
