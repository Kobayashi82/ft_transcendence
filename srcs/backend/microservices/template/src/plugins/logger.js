'use strict'

const fp = require('fastify-plugin')

async function loggerPlugin(fastify, options) {
  // Simplificar el logger para esta versión inicial
  fastify.decorate('logstash', {
    info: (message, data = {}) => {
      fastify.log.info({ msg: message, ...data })
    },
    warn: (message, data = {}) => {
      fastify.log.warn({ msg: message, ...data })
    },
    error: (message, data = {}) => {
      fastify.log.error({ msg: message, ...data })
    },
    debug: (message, data = {}) => {
      fastify.log.debug({ msg: message, ...data })
    }
  })
  
  // Hooks simplificados
  fastify.addHook('onRequest', (request, reply, done) => {
    request.log.info({
      url: request.raw.url,
      method: request.raw.method
    })
    done()
  })
  
  fastify.addHook('onResponse', (request, reply, done) => {
    fastify.log.info({
      msg: 'HTTP Request',
      url: request.raw.url,
      method: request.raw.method,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    })
    done()
  })
}

module.exports = fp(loggerPlugin, {
  name: 'logger',
  dependencies: []
})