"use strict";

const fp = require('fastify-plugin');

async function playerRoutes(fastify) {

  const { playerModel } = fastify;

  // PLAYERS
  fastify.get('/players', async (_, reply) => {
    try {
      const players = playerModel.getAllPlayers();
      return { data: players };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get players' });
    }
  });

}

module.exports = fp(playerRoutes, { name: 'player-routes', dependencies: ['player-model'] });
