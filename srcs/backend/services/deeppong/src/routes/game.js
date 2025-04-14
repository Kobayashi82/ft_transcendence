"use strict";

const { aiController } = require('../plugins/ai-controller');

async function gameRoutes(fastify) {

  fastify.post('/join', async (request, reply) => {
    try {
      const { game_id, player_number, ai_name } = request.body;
      if (!game_id || !player_number || !ai_name) return reply.code(400).send({ success: false });     
      
      let difficulty = 'hard';
      if      (ai_name == 'DeepPong') difficulty = 'hard';
      else if (ai_name == 'K-Pong')   difficulty = 'medium';
      else if (ai_name == 'DumbBot')  difficulty = 'easy';

      await aiController.joinGame(game_id, player_number, ai_name, difficulty);

      return reply.code(200).send({ success: true });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  fastify.get('/games', (_, reply) => {
    try {
      const activeGames = aiController.getActiveGames();      
      return reply.code(200).send({ success: true, activeGames, count: activeGames.length });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  fastify.post('/leave', (request, reply) => {
    try {
      const { game_id, player_number } = request.body;     
      if (!game_id) return reply.code(400).send({ success: false, message: 'Se requiere game_id' });
      
      if (player_number) {
        const gameKey = `${game_id}_${player_number}`;
        aiController.endGame(gameKey);        
        return reply.code(200).send({ success: true });
      }
      
      let found = false;
      aiController.getActiveGames().forEach(game => {
        if (game.gameId === game_id) {
          found = true;
          const gameKey = `${game_id}_${game.playerNumber}`;
          aiController.endGame(gameKey);
        }
      });
      
      if (!found) return reply.code(404).send({ success: false });     
      return reply.code(200).send({ success: true });
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

}

module.exports = gameRoutes;

