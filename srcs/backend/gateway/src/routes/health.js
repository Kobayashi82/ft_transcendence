'use strict'

const axios = require('axios')

// Health check
async function healthRoutes(fastify, options) {
  const services = fastify.config.services
  
  fastify.get('/internal/health', async (request, reply) => {
    const serviceStatus = await checkServices(services)
    
    const gatewayStatus = {
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      services: serviceStatus
    }
 
    return gatewayStatus
  })
}

// Check the status of services
async function checkServices(services) {
  const serviceStatus = {}
  
  await Promise.all( Object.entries(services).map(async ([name, config]) => {
      try {
        const { url } = config
        
        const startTime = Date.now()
        
        // Try making a request to the /internal/health of the service
        const response = await axios.get(`${url}/internal/health`, {
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
