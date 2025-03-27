'use strict'

const fp = require('fastify-plugin')
const authLimits = require('./auth')
const apiLimits = require('./api')

// Common key generators
const keyGenerators = {
  byIP: (req) => req.ip,
  
  byEmailAndIP: (req) => {
    const email = req.body && req.body.email ? req.body.email : 'anonymous';
    return `${req.ip}:login:${email}`;
  },
  
  byUserId: (req) => {
    const userId = req.auth && req.auth.userId ? req.auth.userId : 'anonymous';
    return `user:${userId}`;
  },
  
  byIPAndRoute: (req) => `${req.ip}:${req.url}`
};

async function rateLimitPlugin(fastify, options) {

  await fastify.register(require('@fastify/rate-limit'), {
    redis: fastify.redis,
    skipOnError: true,
    global: false,
    
    onExceeded: (req) => {
      const route = req.url;
      const ip = req.ip;
      
      fastify.logger.warn(`Rate limit exceeded: ${ip} on ${route}`, {
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
  
  fastify.decorate('keyGenerators', keyGenerators);
  
  // Gather all limits
  const routeRateLimits = [
    ...authLimits.getRateLimits(fastify),
    ...apiLimits.getRateLimits(fastify)
  ];
  
  // Log all limits
  routeRateLimits.forEach(route => {
    try {
      fastify.rateLimit({
        method: route.method,
        url: route.pattern,
        config: {
          rateLimit: route.limit
        }
      });
    } catch (err) {
      fastify.logger.error(`Failed to register rate limit for route: ${JSON.stringify(route)}`, err);
    }
  });
  
  fastify.logger.info('Rate limiting plugin configured successfully');
}

module.exports = fp(rateLimitPlugin, { name: 'rate-limit', dependencies: ['@fastify/redis', 'logger'] })
