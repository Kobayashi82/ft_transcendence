'use strict'

const axios = require('axios')

// Health check
async function healthRoutes(fastify, options) {
  const services = fastify.config.services
  
  fastify.get('/internal/health', async (request, reply) => {
    const serviceStatus = await checkServices(services, fastify)
    
    const gatewayStatus = {
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      services: serviceStatus
    }

    // Record overall health check duration
    if (fastify.metrics && fastify.metrics.health) {
      const elapsedSeconds = getElapsedTimeInSeconds(startTime)
      fastify.metrics.health.recordHealthCheckDuration('gateway_overall', elapsedSeconds)
    }

    return gatewayStatus
  })
}

// Check the status of services
async function checkServices(services, fastify) {
  const serviceStatus = {}
  
  await Promise.all( Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config
        const startTime = Date.now()
        
        // Try making a request to the /internal/health of the service
        const response = await axios.get(`${url}/internal/health`, {
          timeout: 3000, validateStatus: () => true
        })
        
        const elapsedSeconds = (Date.now() - startTime) / 1000
        const responseTime = Date.now() - startTime
        const isHealthy = response.status >= 200 && response.status < 300
        const status = isHealthy ? 'healthy' : 'degraded'

        serviceStatus[name] = {
          status,
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        }

        // Record service health metrics
        if (fastify.metrics && fastify.metrics.health) {
          fastify.metrics.health.recordHealthCheck(name, isHealthy)
          fastify.metrics.health.recordHealthCheckDuration(name, elapsedSeconds)
        }
      } catch (error) {
        serviceStatus[name] = {
          status: 'down',
          error: error.code || error.message
        }

        // Record failed service health check
        if (fastify.metrics && fastify.metrics.health) {
          fastify.metrics.health.recordHealthCheck(name, false)
          fastify.metrics.health.recordHealthCheckError(name, error.code || 'unknown_error')
        }
      }
    })
  )
  
  return serviceStatus
}

module.exports = healthRoutes
