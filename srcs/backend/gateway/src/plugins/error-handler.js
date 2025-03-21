'use strict'

const fp = require('fastify-plugin')
const createError = require('http-errors')

async function errorHandlerPlugin(fastify, options) {
  // Decorar Fastify con createError para usarlo en toda la app
  fastify.decorate('createError', createError)
  
  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ 
      error: 'Resource not found',
      path: request.url,
      method: request.method
    })
  })
  
  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    // Registrar el error
    fastify.logger.error('Request failed', { 
      error: error.message, 
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode || 500
    })
    
    // Usar el statusCode del error o 500 por defecto
    const statusCode = error.statusCode || 500
    
    // Preparar respuesta
    const response = { error: statusCode >= 500 && !fastify.config.isDev ? 'Internal Server Error' : error.message, statusCode }

    // Solo incluir stack en desarrollo
    if (fastify.config.isDev && error.stack) { response.stack = error.stack }

    reply.status(statusCode).send(response)
  })
}

// El plugin depende de 'logger'
module.exports = fp(errorHandlerPlugin, { name: 'errorHandler', dependencies: ['logger'] })
