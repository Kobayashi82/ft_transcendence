'use strict'

const fp = require('fastify-plugin')
const helmet = require('@fastify/helmet')

async function helmetPlugin(fastify, options) {
  await fastify.register(helmet, {
    // Disable CSP and FrameGuard since it's managed in the gateway
    contentSecurityPolicy: false,
    frameguard: false,
    
    // Protects against cross-site scripting (XSS) attacks
    xssFilter: true,

    // Hides the "X-Powered-By" header to reduce information exposure
    hidePoweredBy: true,
    
    // Prevent caching of sensitive responses
    noCache: true
  })
  
  fastify.logger.info('Security headers configured correctly')
}

module.exports = fp(helmetPlugin, { name: 'helmet' })
