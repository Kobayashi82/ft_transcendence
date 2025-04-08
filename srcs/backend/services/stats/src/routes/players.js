"use strict";

const fp = require('fastify-plugin');

async function playerRoutes(fastify, options) {
  const { playerModel } = fastify;

  // PLAYERS LIST
  fastify.get('/players', async (request, reply) => {
    try {
      const players = playerModel.getAllPlayers();
      return { data: players };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to get players' });
    }
  });
}

module.exports = fp(playerRoutes, { name: 'player-routes', dependencies: ['player-model'] });
