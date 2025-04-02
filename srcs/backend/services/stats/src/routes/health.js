"use strict";

async function healthRoutes(fastify, options) {
  fastify.get("/health", async (request, reply) => {

      const sampleData = await fastify.seed();
      console.log('\nDatos de prueba generados con éxito!');
      console.log('Ejemplos de URLs para acceder desde el frontend:');
      console.log(`GET /players/${sampleData.samplePlayerId}`);
      console.log(`GET /games/${sampleData.sampleGameId}`);
      console.log(`GET /tournaments/${sampleData.sampleTournamentId}`);
      console.log(`GET /stats/user/${sampleData.samplePlayerUserId}`);

      const serviceStatus = {
        service: {
          name: fastify.config.name,
          status: "up",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: fastify.config.version,
        },
      };
      return serviceStatus;
    }
  );
}

module.exports = healthRoutes;
