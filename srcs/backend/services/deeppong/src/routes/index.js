"use strict";

async function routes(fastify) {

  fastify.register(require("./health"));
  fastify.register(require("./game"));

}

module.exports = routes;
