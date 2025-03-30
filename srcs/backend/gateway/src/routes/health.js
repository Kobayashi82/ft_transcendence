"use strict";

const axios = require("axios");

// Health check
async function healthRoutes(fastify, options) {
  const services = fastify.config.services;

  fastify.get("/internal/health", async (request, reply) => {
    const startTime = Date.now();
    const serviceStatus = await checkServices(services, startTime, fastify);

    const gatewayStatus = {
      gateway: {
        status: "up",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      services: serviceStatus,
    };

    // Record overall health check duration
    if (fastify.metrics && fastify.metrics.health) {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      fastify.metrics.health.recordHealthCheckDuration(
        "gateway_overall",
        elapsedSeconds
      );
    }

    return gatewayStatus;
  });
}

// Check the status of services
async function checkServices(services, startTime, fastify) {
  const serviceStatus = {};

  await Promise.all(
    Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config;

        // Try making a request to the /internal/health of the service
        const response = await axios.get(`${url}/internal/health`, {
          timeout: 3000,
          validateStatus: () => true,
        });

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const responseTime = Date.now() - startTime;
        const isHealthy = response.status >= 200 && response.status < 300;
        const status = isHealthy ? "up" : "degraded";

        serviceStatus[name] = {
          status,
          statusCode: response.status,
          responseTime: `${responseTime}ms`,
        };

        // Record service health metrics
        if (fastify.metrics && fastify.metrics.health) {
          fastify.metrics.health.recordHealthCheck(name, isHealthy);
          fastify.metrics.health.recordHealthCheckDuration(
            name,
            elapsedSeconds
          );
        }
      } catch (error) {
        serviceStatus[name] = {
          status: "down",
          error: error.code || error.message,
        };

        // Record failed service health check
        if (fastify.metrics && fastify.metrics.health) {
          fastify.metrics.health.recordHealthCheck(name, false);
          fastify.metrics.health.recordHealthCheckError(
            name,
            error.code || "unknown_error"
          );
        }
      }
    })
  );

  return serviceStatus;
}

module.exports = healthRoutes;
