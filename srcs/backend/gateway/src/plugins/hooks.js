'use strict'

const fp = require('fastify-plugin')

async function securityHooksPlugin(fastify, options) {
  fastify.addHook('onRequest', (request, reply, done) => {
    // HTTPS Enforcement
    if (!fastify.config.isDev && request.headers['x-forwarded-proto'] !== 'https') {
      reply.redirect(`https://${request.hostname}${request.url}`);
      return;
    }   
    done();
  });

  fastify.addHook('onSend', (request, reply, payload, done) => {
    // Cache-Control Headers
    if (!reply.hasHeader('Cache-Control')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
    
    // Response size limits (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (payload && payload.length > maxSize) {     
      fastify.logger.warn('Response size exceeds limit' , {
        url: request.url,
        method: request.method,
        size: payload.length,
        limit: maxSize
      })

      const payloadTooLargeError = fastify.httpErrors.payloadTooLarge('Response size exceeds maximum allowed size');
      const errorResponse = JSON.stringify(payloadTooLargeError);
      reply.code(413);
      return done(null, errorResponse);
    }
    done(null, payload);
  });
}

module.exports = fp(securityHooksPlugin, { name: 'hooks' })