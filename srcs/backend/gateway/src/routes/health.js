'use strict'

const axios = require('axios')

// Routes for health check of the gateway and services
async function healthRoutes(fastify, options) {
  const services = fastify.config.services
  
  // Service information route
  fastify.get('/services', async (request, reply) => {
	// Obtener status real de los servicios usando la función existente
	const serviceStatus = await checkServices(services);
	
	// Crear lista de servicios con información de disponibilidad
	const serviceInfo = Object.entries(services).map(([name, config]) => ({
	  name,
	  prefix: config.prefix,
	  available: serviceStatus[name]?.status === 'healthy'
	}));
	
	return serviceInfo;
  });

  // Health check endpoint for the gateway
  fastify.get('/health', async (request, reply) => {
    // Check gateway components
    const redisStatus = await checkRedis(fastify)
    const serviceStatus = await checkServices(services)
    
    const gatewayStatus = {
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      dependencies: {
        redis: redisStatus
      },
      services: serviceStatus
    }

    // If any critical component fails, return 503
    const isHealthy = redisStatus.status === 'healthy'
    
    if (!isHealthy) { reply.status(503) }
    
    return gatewayStatus
  })
  
  // Detailed health check for services only
  fastify.get('/health/services', async (request, reply) => {
    const serviceStatus = await checkServices(services)
    
    // If all services are down, return 503
    const allServicesDown = Object.values(serviceStatus).every(service => service.status !== 'healthy')
    
    if (allServicesDown && Object.keys(serviceStatus).length > 0) { reply.status(503) }
    
    return { services: serviceStatus }
  })
  
  // Detailed health check for Redis
  fastify.get('/health/redis', async (request, reply) => {
    const redisStatus = await checkRedis(fastify)
    
    if (redisStatus.status !== 'healthy') { reply.status(503) }
    
    return { redis: redisStatus }
  })
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

// Check the status of the microservices
async function checkServices(services) {
  const serviceStatus = {}
  
  await Promise.all(
    Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config
        
        // Try making a request to the health or root endpoint of the service
        const startTime = Date.now()
        const healthUrl = `${url}/health`
        
        const response = await axios.get(healthUrl, { 
          timeout: 3000,
          validateStatus: () => true // Don't throw errors for non-2xx status codes
        })
        
        const responseTime = Date.now() - startTime
        
        serviceStatus[name] = {
          status: response.status >= 200 && response.status < 300 ? 'healthy' : 'degraded',
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        }
      } catch (error) {
        serviceStatus[name] = {
          status: 'unhealthy',
          error: error.code || error.message
        }
      }
    })
  )
  
  return serviceStatus
}

module.exports = healthRoutes
