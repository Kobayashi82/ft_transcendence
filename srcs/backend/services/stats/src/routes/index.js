"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.register(require("./games"));
  fastify.register(require("./tournaments"));
  fastify.register(require("./players"));
  fastify.register(require("./stats"));
}

module.exports = routes;