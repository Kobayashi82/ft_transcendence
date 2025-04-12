"use strict";

// Import the singleton AI controller instance directly
const { aiController } = require('../plugins/ai-controller');

/**
 * Register all routes for the AI DeepPong service
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Options object
 * @param {Function} done - Callback to signal completion
 */
module.exports = function(fastify, options, done) {
  /**
   * Endpoint para que el servicio de juego asigne un juego a la IA
   * Recibe:
   * - game_id: ID del juego
   * - player_number: Número de jugador (1 o 2)
   * - ai_name: Nombre de la IA
   * - difficulty (opcional): Nivel de dificultad
   */
  fastify.post('/join', async (request, reply) => {
    try {
      const { game_id, player_number, ai_name, difficulty } = request.body;
      
      console.log(`Joining game ${game_id} with AI ${ai_name}`);
      console.log(`Request body: ${JSON.stringify(request.body)}`);
      
      // Validar parámetros
      if (!game_id || !player_number || !ai_name) {
        return reply.code(400).send({
          success: false,
          message: 'Se requiere game_id, player_number y ai_name'
        });
      }
      
      // Asignar el juego a la IA
      console.log(`Calling aiController.joinGame with: ${game_id}, ${player_number}, ${ai_name}, ${difficulty}`);
      await aiController.joinGame(game_id, player_number, ai_name, difficulty);
      
      return reply.code(200).send({
        success: true,
        message: `IA ${ai_name} asignada al juego ${game_id} como jugador ${player_number}`
      });
    } catch (error) {
      console.error(`Error al asignar la IA al juego: ${error.message}`);
      console.error(error.stack); // Print full error stack for debugging
      return reply.code(500).send({
        success: false,
        message: 'Error interno al procesar la solicitud'
      });
    }
  });

  /**
   * Obtiene el estado de los juegos activos
   */
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

  /**
   * Libera a la IA de un juego específico
   */
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