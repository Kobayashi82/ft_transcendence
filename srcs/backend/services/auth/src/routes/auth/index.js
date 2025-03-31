"use strict";

async function authRoutes(fastify, options) {
  fastify.register(require("./basic"));
  // fastify.register(require("./session"));
  fastify.register(require("./register"));
  fastify.register(require("./oauth_google"));
  fastify.register(require("./oauth_fortytwo"));
  fastify.register(require("./token"));
  // fastify.register(require("./recovery"));
  // fastify.register(require("./two_factor"));
  // fastify.register(require("./user"));
}

module.exports = authRoutes;
