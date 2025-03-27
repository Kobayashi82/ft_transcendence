'use strict'

const axios = require('axios')

// Health check
async function healthRoutes(fastify, options) {
  const services = fastify.config.services
  
  fastify.get('/health', async (request, reply) => {

    const redisStatus = await checkRedis(fastify)
    const serviceStatus = await checkServices(services)
    
    const gatewayStatus = {
      gateway: {
        status: redisStatus.status === 'healthy' ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      dependencies: {
        redis: redisStatus
      },
      services: serviceStatus
    }

    const isHealthy = redisStatus.status === 'healthy'   
    if (!isHealthy) { reply.status(503) }
    
    return gatewayStatus
  })
}

// Check the status of Redis
async function checkRedis(fastify) {
  try {
    const startTime = Date.now()
    if (fastify.cache.isRedisAvailable) {
      const pong = await fastify.redis.ping()
      const responseTime = Date.now() - startTime
      
      return {
        status: pong === 'PONG' ? 'healthy' : 'degraded',
        responseTime: `${responseTime}ms`
      }
    } else {
      const responseTime = Date.now() - startTime
      return {
        status: 'degraded',
        responseTime: `${responseTime}ms`
      }
    }
  } catch (error) {
    return {
      status: 'down',
      error: error.message
    }
  }
}

// Check the status of the services
async function checkServices(services) {
  const serviceStatus = {}
  
  await Promise.all( Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config
        
        const startTime = Date.now()
        
        // Try making a request to the /health of the service
        const response = await axios.get(`${url}/health`, {
          timeout: 3000, validateStatus: () => true
        })
        
        const responseTime = Date.now() - startTime
        
        serviceStatus[name] = {
          status: response.status >= 200 && response.status < 300 ? 'healthy' : 'degraded',
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        }
      } catch (error) {
        serviceStatus[name] = {
          status: 'down',
          error: error.code || error.message
        }
      }
    })
  )
  
  return serviceStatus
}

module.exports = healthRoutes
