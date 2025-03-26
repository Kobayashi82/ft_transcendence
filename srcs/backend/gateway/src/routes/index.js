'use strict'

async function routes(fastify, options) {

  fastify.register(require('./api'))
  fastify.register(require('./health'))

}

module.exports = routes
