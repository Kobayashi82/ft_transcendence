'use strict'

async function routes(fastify, options) { 
  fastify.register(require('./health'))
  fastify.register(require('./auth'))
  fastify.register(require('./oauth'))
  fastify.register(require('./admin'), { prefix: '/admin' })
}

module.exports = routes
