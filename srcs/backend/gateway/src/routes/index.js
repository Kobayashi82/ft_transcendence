"use strict";

async function routes(fastify) {
  fastify.register(require("./health"));
}

module.exports = routes;
