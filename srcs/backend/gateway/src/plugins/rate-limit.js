'use strict'

const fp = require('fastify-plugin')

async function rateLimitPlugin(fastify, options) {

  await fastify.register(require('@fastify/rate-limit'), {
    redis: fastify.redis,
    skipOnError: true,
    global: false,

    onExceeded: (req) => {
      const route = req.url;
      const ip = req.ip;
      
      fastify.logger.warn(`Rate limit exceeded: ${ip} en ${route}`, {
        ip: ip,
        url: route,
        method: req.method
      });
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Too many requests, please try again after ${context.after}`
      }
    }
  });
  
  // Define specific limits for different routes
  const authLoginLimit = {
    max: 30,
    timeWindow: '5 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:login:${email}`;
    }
  };
  
  const authRegisterLimit = {
    max: 20,
    timeWindow: '30 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:register:${email}`;
    }
  };
  
  const authPasswordResetLimit = {
    max: 15,
    timeWindow: '15 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:password:${email}`;
    }
  };
  
  const authOauthLimit = {
    max: 30,
    timeWindow: '10 minutes'
  };
  
  const authValidateLimit = {
    max: 100,
    timeWindow: '1 minute'
  };
  
  const apiStandardLimit = {
    max: 200,
    timeWindow: '1 minute'
  };
  
  const apiSensitiveLimit = {
    max: 50,
    timeWindow: '1 minute'
  };
  
  // Add a hook to apply rate limits based on the route
  fastify.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    const method = request.method;
    
    // Create an object to store the rate limit configuration
    let rateLimit = null;
    
    // Determine which rate limit to apply based on the route
    if (url.startsWith('/auth/login') && method === 'POST') {
      rateLimit = authLoginLimit;
    } else if (url.startsWith('/auth/register') && method === 'POST') {
      rateLimit = authRegisterLimit;
    } else if (url.startsWith('/auth/password/reset') && method === 'POST') {
      rateLimit = authPasswordResetLimit;
    } else if (url.match(/\/auth\/oauth\/(google|42)\/init/) && method === 'GET') {
      rateLimit = authOauthLimit;
    } else if (url.startsWith('/auth/validate') && method === 'GET') {
      rateLimit = authValidateLimit;
    } else if (url.startsWith('/api/') && isSensitiveRoute(url)) {
      rateLimit = apiSensitiveLimit;
    } else if (url.startsWith('/api/')) {
      rateLimit = apiStandardLimit;
    }
    
    // If there is a rate limit configuration, apply it
    if (rateLimit) {
      reply.context.config = reply.context.config || {};
      reply.context.config.rateLimit = rateLimit;
    }
  });
  
  // Helper function to determine if a route is sensitive
  function isSensitiveRoute(url) {
    // Implement logic to identify sensitive routes
    const sensitivePatterns = [
      '/api/user',
      '/api/admin',
      '/api/auth'
    ];
    
    return sensitivePatterns.some(pattern => url.startsWith(pattern));
  }
  
  fastify.logger.info('Rate limiting plugin configured successfully');
}

module.exports = fp(rateLimitPlugin, { name: 'rateLimit', dependencies: ['redis', 'logger'] });