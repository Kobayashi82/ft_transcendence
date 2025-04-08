"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.register(require("./pong"));
  fastify.register(require("./tournament"));
}

module.exports = routes;