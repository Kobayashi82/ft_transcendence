'use strict'

// Routes for health check of the user microservice
async function healthRoutes(fastify, options) {
  // Health check endpoint for the user microservice
  fastify.get('/health', async (request, reply) => {
    // Check critical components
    const databaseStatus = await checkDatabase(fastify)
    const redisStatus = await checkRedis(fastify)
    
    const serviceStatus = {
      service: {
        name: fastify.config.serviceName,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      dependencies: {
        database: databaseStatus,
        redis: redisStatus
      }
    }

    // Si algún componente crítico falla, devolver 503
    const isHealthy = databaseStatus.status === 'healthy' && redisStatus.status === 'healthy'
    
    if (!isHealthy) {
      reply.status(503)
    }
    
    return serviceStatus
  })
  
  // Detailed health check for database only
  fastify.get('/health/database', async (request, reply) => {
    const dbStatus = await checkDatabase(fastify)
    
    if (dbStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { database: dbStatus }
  })
  
  // Detailed health check for Redis
  fastify.get('/health/redis', async (request, reply) => {
    const redisStatus = await checkRedis(fastify)
    
    if (redisStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { redis: redisStatus }
  })
}

// Check the status of the database
async function checkDatabase(fastify) {
  try {
    const startTime = Date.now()
    
    // Ejecutar una consulta simple para verificar que la base de datos responde
    await fastify.db.get('SELECT 1 as check', [])
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    }
  }
}

// Check the status of Redis
async function checkRedis(fastify) {
  try {
    const startTime = Date.now()
    const pong = await fastify.redis.ping()
    const responseTime = Date.now() - startTime
    
    return {
      status: pong === 'PONG' ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    }
  }
}

module.exports = healthRoutes
