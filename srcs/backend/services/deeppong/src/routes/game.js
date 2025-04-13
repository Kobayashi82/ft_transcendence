"use strict";

const { aiController } = require('../plugins/ai-controller');

module.exports = function(fastify, options, done) {

  fastify.post('/join', async (request, reply) => {
    try {
      const { game_id, player_number, ai_name } = request.body;
      
      let difficulty;
      if      (ai_name == 'DeepPong') difficulty = 'hard';
      else if (ai_name == 'K-Pong')   difficulty = 'medium';
      else if (ai_name == 'DumbBot')  difficulty = 'easy';
      else                            difficulty = 'hard';

      if (!game_id || !player_number || !ai_name) {
        return reply.code(400).send({
          success: false,
          message: 'Se requiere game_id, player_number y ai_name'
        });
      }
      
      await aiController.joinGame(game_id, player_number, ai_name, difficulty);
      
      return reply.code(200).send({
        success: true,
        message: `IA ${ai_name} asignada al juego ${game_id} como jugador ${player_number}`
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  fastify.get('/games', (request, reply) => {
    try {
      const activeGames = aiController.getActiveGames();
      
      return reply.code(200).send({
        success: true,
        activeGames,
        count: activeGames.length
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  fastify.post('/leave', (request, reply) => {
    try {
      const { game_id, player_number } = request.body;
      
      if (!game_id) {
        return reply.code(400).send({
          success: false,
          message: 'Se requiere game_id'
        });
      }
      
      // Si se proporciona player_number, terminamos solo esa instancia específica
      if (player_number) {
        const gameKey = `${game_id}_${player_number}`;
        aiController.endGame(gameKey);
        
        return reply.code(200).send({
          success: true,
          message: `IA liberada del juego ${game_id} como jugador ${player_number}`
        });
      }
      
      // Si no se proporciona player_number, buscar todas las instancias de este juego
      let found = false;
      aiController.getActiveGames().forEach(game => {
        if (game.gameId === game_id) {
          found = true;
          const gameKey = `${game_id}_${game.playerNumber}`;
          aiController.endGame(gameKey);
        }
      });
      
      if (!found) {
        return reply.code(404).send({
          success: false,
          message: `No se encontró ninguna IA en el juego ${game_id}`
        });
      }
      
      return reply.code(200).send({
        success: true,
        message: `Todas las IAs liberadas del juego ${game_id}`
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  done();
};
