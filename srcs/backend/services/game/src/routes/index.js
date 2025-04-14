"use strict";

async function routes(fastify) {

  fastify.register(require("./health"));
  fastify.register(require("./game"));
  fastify.register(require("./tournament"));

}

module.exports = routes;
