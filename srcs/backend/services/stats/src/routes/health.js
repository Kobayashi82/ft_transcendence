"use strict";

async function healthRoutes(fastify) {

  fastify.get("/health", async () => {
    const serviceStatus = {
      service: {
        name: 'Stats',
        status: "up",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: fastify.config.version,
      },
    }
    return serviceStatus;
  });
}

module.exports = healthRoutes;
