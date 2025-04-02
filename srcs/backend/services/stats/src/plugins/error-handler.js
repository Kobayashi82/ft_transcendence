"use strict";

const fp = require("fastify-plugin");

async function errorHandlerPlugin(fastify, options) {

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

    console.error("Request failed", {
      error: error.message,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode || 500,
    });

    // Handle validation errors
    if (error.validation) {
      return reply
        .code(400)
        .send({ error: 'Validation Error', details: error.validation });
    }
    
    // Handle database errors
    if (error.code && error.code.startsWith('SQLITE_')) {
      return reply
        .code(500)
        .send({ error: 'Database Error', message: error.message });
    }
    
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? "Internal Server Error" : error.message
    });
  });
}

module.exports = fp(errorHandlerPlugin, { name: "errorHandler" });
