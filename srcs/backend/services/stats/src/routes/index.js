"use strict";

async function routes(fastify) {

  fastify.register(require("./health"));
  fastify.register(require("./players"));
  fastify.register(require("./games"));
  fastify.register(require("./tournaments"));
  fastify.register(require("./stats"));

}

module.exports = routes;
