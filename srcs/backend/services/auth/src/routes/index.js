"use strict";

async function routes(fastify, options) {
  fastify.register(require("./service"));
  fastify.register(require("./auth"));
}

module.exports = routes;
