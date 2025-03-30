"use strict";

async function routes(fastify, options) {
  fastify.register(require("./health"));
  fastify.get("/openapi", async (request, reply) => {
    return fastify.swagger();
  });
}

module.exports = routes;
