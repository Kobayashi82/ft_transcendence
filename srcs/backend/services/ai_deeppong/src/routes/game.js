"use strict";

const { aiController } = require('../plugins/ai-controller');

module.exports = function(fastify, options, done) {

  fastify.post('/join', async (request, reply) => {
    try {
      const { game_id, player_number, ai_name } = request.body;
      
      const difficulty = 'medium'
      console.log(`Joining game ${game_id} with AI ${ai_name}`);
      console.log(`Request body: ${JSON.stringify(request.body)}`);
      
      if (!game_id || !player_number || !ai_name) {
        return reply.code(400).send({
          success: false,
          message: 'Se requiere game_id, player_number y ai_name'
        });
      }
      
      console.log(`Calling aiController.joinGame with: ${game_id}, ${player_number}, ${ai_name}, ${difficulty}`);
      await aiController.joinGame(game_id, player_number, ai_name, difficulty);
      
      return reply.code(200).send({
        success: true,
        message: `IA ${ai_name} asignada al juego ${game_id} como jugador ${player_number}`
      });
    } catch (error) {
      console.error(`Error al asignar la IA al juego: ${error.message}`);
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
      console.error(`Error al obtener juegos activos: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  fastify.post('/leave', (request, reply) => {
    try {
      const { game_id } = request.body;
      
      if (!game_id) {
        return reply.code(400).send({
          success: false,
          message: 'Se requiere game_id'
        });
      }
      
      aiController.endGame(game_id);
      
      return reply.code(200).send({
        success: true,
        message: `IA liberada del juego ${game_id}`
      });
    } catch (error) {
      console.error(`Error al liberar a la IA del juego: ${error.message}`);
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  done();
};