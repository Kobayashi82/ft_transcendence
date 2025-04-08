"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.register(require("./game"));
  fastify.register(require("./tournament"));
}

module.exports = routes;