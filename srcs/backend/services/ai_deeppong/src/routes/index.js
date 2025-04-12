"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.register(require("./game"));
}

module.exports = routes;