'use strict'

const fp = require('fastify-plugin')
const helmet = require('@fastify/helmet')

async function helmetPlugin(fastify, options) {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    // Configuración para permitir iframes con el mismo origen
    frameguard: { 
      action: 'sameorigin' 
    },
    // Habilitar XSS Protection
    xssFilter: true,
    // No exponer la versión del servidor
    hidePoweredBy: true
  })
  
  fastify.logger.info('Security headers configurados correctamente')
}

module.exports = fp(helmetPlugin, { name: 'helmet' })