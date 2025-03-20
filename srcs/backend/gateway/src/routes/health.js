'use strict'

const axios = require('axios')

/**
 * Rutas para health check del gateway y servicios
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones
 */
async function healthRoutes(fastify, options) {
  const { services } = fastify.config
  
  // Endpoint de health check para el gateway
  fastify.get('/health', async (request, reply) => {
    // Verificar componentes del gateway
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

    // Si algún componente crítico falló, devolver 503
    const isHealthy = redisStatus.status === 'healthy'
    
    if (!isHealthy) {
      reply.status(503)
    }
    
    return gatewayStatus
  })
  
  // Health check detallado solo para servicios
  fastify.get('/health/services', async (request, reply) => {
    const serviceStatus = await checkServices(services)
    
    // Si todos los servicios están caídos, devolver 503
    const allServicesDown = Object.values(serviceStatus).every(
      service => service.status !== 'healthy'
    )
    
    if (allServicesDown && Object.keys(serviceStatus).length > 0) {
      reply.status(503)
    }
    
    return { services: serviceStatus }
  })
  
  // Health check detallado para Redis
  fastify.get('/health/redis', async (request, reply) => {
    const redisStatus = await checkRedis(fastify)
    
    if (redisStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { redis: redisStatus }
  })
}

/**
 * Comprobar el estado de Redis
 */
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
    fastify.log.error(error, 'Error al verificar estado de Redis')
    return {
      status: 'unhealthy',
      error: error.message
    }
  }
}

/**
 * Comprobar el estado de los servicios backend
 */
async function checkServices(services) {
  const serviceStatus = {}
  
  await Promise.all(
    Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config
        
        // Intentar hacer petición al endpoint de health o raíz del servicio
        const startTime = Date.now()
        const healthUrl = `${url}/health`
        
        const response = await axios.get(healthUrl, { 
          timeout: 3000,
          validateStatus: () => true // No lanzar errores para status codes
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