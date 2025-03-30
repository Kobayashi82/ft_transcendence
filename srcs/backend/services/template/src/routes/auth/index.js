"use strict";

async function authRoutes(fastify, options) {
  fastify.register(require("./login"));
  fastify.register(require("./logout"));
  fastify.register(require("./register"));
  fastify.register(require("./oauth_google"));
  fastify.register(require("./oauth_fortytwo"));
  fastify.register(require("./token"));
}

module.exports = authRoutes;
