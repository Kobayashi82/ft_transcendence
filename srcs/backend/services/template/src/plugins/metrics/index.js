"use strict";

const fp = require("fastify-plugin");
const promClient = require("prom-client");

const dbMetrics = require("./db");

async function metricsPlugin(fastify, options) {
  const register = new promClient.Registry();
  const serviceName = fastify.config.serviceName;

  // Register default Node.js metrics
  promClient.collectDefaultMetrics({ register, prefix: `${serviceName}_` });

  // Initialize metric modules
  // const db = dbMetrics(promClient, serviceName);

  // Register all metrics in the global registry
  // register.registerMetric(db.dbOperationsTotal);
  // register.registerMetric(db.dbOperationDuration);

  fastify.decorate("metrics", {
    // db,
  });

  // Add hook for basic request/response metrics
  fastify.addHook("onRequest", (request, reply, done) => {
    request.metrics = { startTime: process.hrtime() };
    done();
  });

  fastify.addHook("onResponse", (request, reply, done) => {
    const route = request.routeOptions?.url || request.raw.url;
    const method = request.raw.method;
    const statusCode = reply.statusCode.toString();
    const responseTimeInSeconds = reply.elapsedTime / 1000;

    // Record basic HTTP metrics
    if (statusCode >= 400) {
      fastify.metrics.proxy.recordHttpError(
        fastify.config.serviceName,
        method,
        statusCode,
        route
      );
    }

    // Record proxy metrics if it's a proxied request
    const targetService = request.headers["x-target"];
    if (targetService) {
      fastify.metrics.proxy.recordRequest(targetService, method, statusCode);
      fastify.metrics.proxy.recordLatency(
        targetService,
        method,
        responseTimeInSeconds
      );
    }

    done();
  });

  // Endpoint to expose metrics to Prometheus
  fastify.get("/internal/metrics", async (request, reply) => {
    return reply
      .header("Content-Type", register.contentType)
      .send(await register.metrics());
  });

  // Configure periodic metrics update (every 1 minute)
  setInterval(async () => {
    try {
      // Actived users
      const activeUsers = await fastify.db.get(
        "SELECT COUNT(*) as count FROM users WHERE is_active = true AND is_deleted = false"
      );
      if (activeUsers && activeUsers.count) {
        fastify.metrics.auth.setActiveUsers(activeUsers.count);
      }

      // Actived sessions
      const activeSessions = await fastify.db.get(
        "SELECT COUNT(*) as count FROM sessions WHERE revoked = false AND expires_at > CURRENT_TIMESTAMP"
      );
      if (activeSessions && activeSessions.count) {
        fastify.metrics.auth.setActiveSessions(activeSessions.count);
      }
    } catch (err) {
      fastify.logger.error(`Error updating metrics: ${err.message}`);
    }
  }, 60000);
}

module.exports = fp(metricsPlugin, { name: "metrics" });
