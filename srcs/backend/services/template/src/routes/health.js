"use strict";

const healthSchema = require("../schemas/health");

async function healthRoutes(fastify, options) {
  fastify.get(
    "/internal/health",
    { schema: healthSchema.schema },
    async (request, reply) => {
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
