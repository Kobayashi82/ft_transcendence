"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.register(require("./auth"));
  fastify.get("/openapi", async (request, reply) => {
    return fastify.swagger();
  });
}

module.exports = routes;
