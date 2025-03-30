"use strict";

const fp = require("fastify-plugin");

async function errorHandlerPlugin(fastify, options) {
  await fastify.register(require("@fastify/sensible"));

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: "Resource not found",
      path: request.url,
      method: request.method,
    });
  });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    // Log the error
    fastify.logger.error("Request failed", {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode || 500,
    });

    // Use the error's statusCode or 500 by default
    const statusCode = error.statusCode || 500;
    const response = {
      error:
        statusCode >= 500 && !fastify.config.isDev
          ? "Internal Server Error"
          : error.message,
      statusCode,
    };

    // Include stack only in development
    if (fastify.config.isDev && error.stack) {
      response.stack = error.stack;
    }

    reply.status(statusCode).send(response);
  });
}

module.exports = fp(errorHandlerPlugin, {
  name: "errorHandler",
  dependencies: ["logger"],
});
