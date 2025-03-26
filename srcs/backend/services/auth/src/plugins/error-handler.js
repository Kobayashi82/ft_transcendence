'use strict'

const fp = require('fastify-plugin')
const createError = require('http-errors')

async function errorHandlerPlugin(fastify, options) {

  fastify.decorate('createError', createError)
  
  fastify.setNotFoundHandler((request, reply) => {
    fastify.logger.warn('Resource not found', { 
      path: request.url,
      method: request.method,
      ip: request.ip
    })

    reply.code(404).send({ 
      error: 'Resource not found',
      path: request.url,
      method: request.method
    })
  })
  
  fastify.setErrorHandler((error, request, reply) => {
    fastify.logger.error('Request failed', { 
      error: error.message, 
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode || 500
    })
    
    const statusCode = error.statusCode || 500
    const response = { error: statusCode >= 500 && !fastify.config.isDev ? 'Internal Server Error' : error.message, statusCode  }

    // Only include stack trace in development
    if (fastify.config.isDev && error.stack) { response.stack = error.stack }

    reply.status(statusCode).send(response)
  })
}

module.exports = fp(errorHandlerPlugin, { name: 'errorHandler', dependencies: ['logger'] })
