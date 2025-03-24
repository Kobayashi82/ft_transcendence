'use strict'

async function routes(fastify, options) {
  
  fastify.get('/', async (request, reply) => {
    return { 
      service: fastify.config.serviceName,
      status: 'active',
      version: '1.0.0'
    }
  })
  
  // Health check endpoint
  fastify.register(require('./health'))
  
  // Auth routes
  fastify.register(require('./auth'))
  
  // OAuth routes
  // fastify.register(require('./oauth'))
  
  // Admin routes (protegidas)
  fastify.register(require('./admin'), { prefix: '/admin' })
}

module.exports = routes
