'use strict'

const fp = require('fastify-plugin')

/**
 * Plugin para configurar logging avanzado y filtrado de métricas
 * Este plugin extiende la funcionalidad del logger incorporado en Fastify
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones del plugin
 */
async function loggerPlugin(fastify, options) {
  // Paths o rutas de métricas que queremos filtrar
  const metricsRoutes = [
    '/metrics',
    '/health',
    '/ping',
    '/status'
  ];
  
  // Reemplazar el método info para filtrar métricas
  const originalLogger = fastify.log;
  const originalInfo = originalLogger.info.bind(originalLogger);
  
  originalLogger.info = function(obj, ...args) {
    // Si es un objeto de log y tiene una URL que corresponde a métricas, no lo logueamos
    if (obj && typeof obj === 'object' && obj.url && 
        metricsRoutes.some(route => obj.url.startsWith(route))) {
      // Omitir logs de rutas de métricas
      return;
    }
    
    // Proceder con el log normal para todo lo demás
    originalInfo(obj, ...args);
  };
  
  // Añadir hooks para loggear información de las solicitudes
  fastify.addHook('onRequest', (request, reply, done) => {
    // No loguear rutas de métricas
    if (!metricsRoutes.some(route => request.url.startsWith(route))) {
      request.log.info({
        url: request.url,
        method: request.method,
        id: request.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        // Usar routeOptions.url en lugar de routerPath (deprecado)
        route: request.routeOptions?.url || 'unknown'
      }, 'Solicitud recibida')
    }
    done()
  })
  
  // Log detallado para cada respuesta enviada
  fastify.addHook('onResponse', (request, reply, done) => {
    // No loguear respuestas de métricas
    if (!metricsRoutes.some(route => request.url.startsWith(route))) {
      // Usar reply.elapsedTime en lugar de getResponseTime() (deprecado)
      const responseTime = reply.elapsedTime
      
      request.log.info({
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: `${responseTime.toFixed(2)}ms`,
        id: request.id,
        // Usar routeOptions.url en lugar de routerPath (deprecado)
        route: request.routeOptions?.url || 'unknown'
      }, 'Respuesta enviada')
    }
    done()
  })
  
  // Log para errores (siempre logueamos los errores)
  fastify.addHook('onError', (request, reply, error, done) => {
    request.log.error({
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      error: error.message,
      stack: error.stack,
      id: request.id,
      // Usar routeOptions.url en lugar de routerPath (deprecado)
      route: request.routeOptions?.url || 'unknown'
    }, 'Error en solicitud')
    done()
  })
  
  // Utilidad para logs estructurados
  fastify.decorate('logRequest', function(request, message, data = {}) {
    // No loguear solicitudes de métricas
    if (!metricsRoutes.some(route => request.url.startsWith(route))) {
      request.log.info({
        ...data,
        url: request.url,
        method: request.method,
        id: request.id,
      }, message)
    }
  })
}

module.exports = fp(loggerPlugin, {
  name: 'logger',
  fastify: '4.x'
})