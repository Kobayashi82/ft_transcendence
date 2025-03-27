'use strict'

const fp = require('fastify-plugin')

async function securityHooksPlugin(fastify, options) {
  // Cache-Control Headers
  fastify.addHook('onSend', (request, reply, payload, done) => {
    // Only set Cache-Control if it hasn't been set by the service
    if (!reply.hasHeader('Cache-Control')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
    done(null, payload);
  });

  // HTTPS Enforcement (for production)
  fastify.addHook('onRequest', (request, reply, done) => {
    if (!fastify.config.isDev && request.headers['x-forwarded-proto'] !== 'https') {
      reply.redirect(`https://${request.hostname}${request.url}`);
      return;
    }
    done();
  });

}

module.exports = fp(securityHooksPlugin, { name: 'hooks' })
