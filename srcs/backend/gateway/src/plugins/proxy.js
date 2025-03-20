'use strict'

const fp = require('fastify-plugin')
const httpProxy = require('@fastify/http-proxy')
const createError = require('http-errors')

/**
 * Plugin para enrutar solicitudes a los microservicios correspondientes
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones del plugin
 */
async function proxyPlugin(fastify, options) {
  const { services } = fastify.config
  
  // Registra un proxy para cada servicio
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    const { url, prefix, proxyOptions = {}, timeout } = serviceConfig
    
    fastify.log.info(`Registrando proxy para ${serviceName} en ${prefix} → ${url}`)
    
    fastify.register(httpProxy, {
      upstream: url,
      prefix: prefix,
      http2: false,
      replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
          // Añadir headers relevantes como X-Forwarded-*
          headers['x-forwarded-proto'] = req.protocol
          headers['x-forwarded-host'] = req.headers.host
          
          // Headers personalizados para identificar solicitudes del gateway
          headers['x-gateway-timestamp'] = Date.now().toString()
          headers['x-gateway-service'] = serviceName
          
          // Aplicar reescrituras personalizadas específicas del servicio
          if (proxyOptions.rewriteRequestHeaders) {
            headers = proxyOptions.rewriteRequestHeaders(req, headers)
          }
          
          return headers
        }
      },
      // Configurar timeout para la solicitud
      httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      timeout: timeout,
      ...proxyOptions
    })
  }

  // Middleware para capturar errores de timeout y otros errores de proxy
  fastify.setErrorHandler(function (error, request, reply) {
    // Manejo específico para errores de proxy
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      fastify.log.error({
        err: error, 
        service: request.headers['x-gateway-service']
      }, 'Error de comunicación con el microservicio')
      
      const httpError = createError(503, 'Servicio temporalmente no disponible')
      reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: httpError.message
      })
      return
    }
    
    // Para otros errores, delegar al manejador de errores global
    reply.send(error)
  })
}

module.exports = fp(proxyPlugin, {
  name: 'proxy',
  dependencies: ['redis', 'logger', 'metrics']
})