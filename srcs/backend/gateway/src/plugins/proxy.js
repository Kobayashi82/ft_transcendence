'use strict'

const fp = require('fastify-plugin')
const httpProxy = require('@fastify/http-proxy')
const createError = require('http-errors')

// Plugin to route requests to the corresponding microservices
async function proxyPlugin(fastify, options) {
  const { services } = fastify.config
  
  // Register a proxy for each service
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    const { url, prefix, routes = {}, proxyOptions = {}, timeout } = serviceConfig
    
    fastify.register(httpProxy, {
      upstream: url,
      prefix: prefix,
      http2: false,
      replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
          // Add relevant headers like X-Forwarded-*
          headers['x-forwarded-proto'] = req.protocol
          headers['x-forwarded-host'] = req.headers.host
          
          // Custom headers to identify requests from the gateway
          headers['x-gateway-timestamp'] = Date.now().toString()
          headers['x-gateway-service'] = serviceName
          
          // Add user information to the request if authenticated
          if (req.auth && req.auth.authenticated) {
            headers['x-user-id'] = req.auth.userId.toString()
            headers['x-user-roles'] = JSON.stringify(req.auth.roles)
            headers['x-user-email'] = req.auth.email
            
            // Additionally, you could add more information as needed
            if (req.user) {
              headers['x-user-info'] = Buffer.from(JSON.stringify(req.user)).toString('base64')
            }
          }
          
          // Apply custom header rewrites specific to the service
          if (proxyOptions.rewriteRequestHeaders) {
            headers = proxyOptions.rewriteRequestHeaders(req, headers)
          }
          
          return headers
        }
      },
      // Set request timeout
      httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      timeout: timeout,
      ...proxyOptions
    })
  }

  // Middleware to capture timeout errors and other proxy errors
  fastify.setErrorHandler(function (error, request, reply) {
    // Specific handling for proxy errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      fastify.logger.error('Communication error with the microservice', {
        err: error, 
        service: request.headers['x-gateway-service']
      })
      
      const httpError = createError(503, 'Service temporarily unavailable')
      reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: httpError.message
      })
      return
    }
    
    // For other errors, delegate to the global error handler
    reply.send(error)
  })
}

module.exports = fp(proxyPlugin, { name: 'proxy', dependencies: ['redis', 'metrics', 'auth', 'logger'] })
