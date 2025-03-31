"use strict";

const { healthSchema } = require("../schemas/service");

async function serviceRoutes(fastify, options) {
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

  fastify.get("/openapi", async (request, reply) => {
    // Get the swagger data
    const swaggerData = fastify.swagger();

    // List of routes to exclude
    const excludedRoutes = ["/internal/health", "/openapi"];

    // Filter out the excluded routes from the paths object
    if (swaggerData.paths) {
      for (const path in swaggerData.paths) {
        if (excludedRoutes.some((route) => path.startsWith(route))) {
          delete swaggerData.paths[path];
        }
      }
    }

    return swaggerData;
  });
}

module.exports = serviceRoutes;
