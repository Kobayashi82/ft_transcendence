'use strict'

async function routes(fastify, options) {
  
  fastify.get('/', async (request, reply) => {
    return { 
      service: fastify.config.serviceName,
      status: 'activo',
      version: '1.0.0'
    }
  })
 
  
// Health check endpoint
fastify.get('/health', async () => {
	const dbStatus = fastify.db ? 'connected' : 'disconnected'
	const redisStatus = fastify.redis ? 'connected' : 'disconnected'
	
	return {
	  status: 'ok',
	  timestamp: new Date().toISOString(),
	  service: fastify.config.serviceName,
	  dependencies: {
		db: dbStatus,
		redis: redisStatus
	  }
	}
})

  fastify.register(require('./users'), { prefix: '/users' })

}

module.exports = routes
