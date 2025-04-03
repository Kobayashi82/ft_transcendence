"use strict";

const axios = require("axios");
const { name } = require("../config/services/stats");

// Health check
async function healthRoutes(fastify, options) {
  const services = fastify.config.services;

  fastify.get("/health", async (request, reply) => {
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

        // Try making a request to the /health of the service
        const response = await axios.get(`${url}/health`, {
          timeout: 2000,
          validateStatus: () => true,
        });

        const responseTime = Date.now() - startTime;
        const isHealthy = response.status >= 200 && response.status < 300;
        const status = isHealthy ? "up" : "degraded";

        const serv_name = response.data.service.name || name;
        serviceStatus[serv_name] = {
          status,
          statusCode: response.status,
          responseTime: `${responseTime}ms`,
        };
      } catch (error) {
        let temp_name;
        if (name === 'ai_deeppong') temp_name = 'AI DeepPong';
        if (name === 'game') temp_name = 'Game';
        if (name === 'stats') temp_name = 'Stats';
        serviceStatus[temp_name] = {
          status: "down",
          error: error.code || error.message,
        };
      }
    })
  );

  return serviceStatus;
}

module.exports = healthRoutes;
