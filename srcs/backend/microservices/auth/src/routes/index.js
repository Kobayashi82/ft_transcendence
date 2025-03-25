'use strict'

async function routes(fastify, options) { 
  fastify.register(require('./health'))
  fastify.register(require('./auth'))
  fastify.register(require('./admin'), { prefix: '/admin' })
  fastify.get('/openapi', async (request, reply) => { return fastify.swagger(); })
}

module.exports = routes
