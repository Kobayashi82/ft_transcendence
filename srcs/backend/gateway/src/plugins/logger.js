'use strict'

const fp = require('fastify-plugin')

/**
 * Plugin for logging
 * 
 * @param {FastifyInstance} fastify		Fastify instance
 * @param {Object} options 				Plugin options
 */
async function loggerPlugin(fastify, options) {
  
  // Hook for incoming requests
  fastify.addHook('onRequest', (request, reply, done) => {
    request.log.info({
      url: request.url,
      method: request.method,
      id: request.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      route: request.routeOptions?.url || 'unknown'
    }, 'incoming request');
    
    done();
  });
  
  // Hook for completed requests
  fastify.addHook('onResponse', (request, reply, done) => {
    const responseTime = reply.elapsedTime;
    
    request.log.info({
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      id: request.id,
      route: request.routeOptions?.url || 'unknown'
    }, 'request completed');
    
    done();
  });
  
  // Hook for errors
  fastify.addHook('onError', (request, reply, error, done) => {
    request.log.error({
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      error: error.message,
      stack: error.stack,
      id: request.id,
      route: request.routeOptions?.url || 'unknown'
    }, 'request error');
    
    done();
  });
  
  // Decorate log with Fastify
  fastify.decorate('logRequest', function(request, message, data = {}) {
    request.log.info({
      ...data,
      url: request.url,
      method: request.method,
      id: request.id,
    }, message);
  });
}

module.exports = fp(loggerPlugin, { name: 'logger', fastify: '4.x' });
