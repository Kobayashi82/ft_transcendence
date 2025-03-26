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
  
  // Define routes with their specific rate limits
  const routeRateLimits = [
    { pattern: '/auth/login', method: 'POST', limit: authLoginLimit },
    { pattern: '/auth/register', method: 'POST', limit: authRegisterLimit },
    { pattern: '/auth/password/reset', method: 'POST', limit: authPasswordResetLimit },
    { pattern: { regex: /\/auth\/oauth\/(google|42)\/init/ }, method: 'GET', limit: authOauthLimit },
    { pattern: '/auth/validate', method: 'GET', limit: authValidateLimit }
  ];
  
  // Add sensitive API routes
  const sensitivePatterns = ['/api/user', '/api/admin', '/api/auth'];
  sensitivePatterns.forEach(pattern => {
    routeRateLimits.push({ pattern, method: '*', limit: apiSensitiveLimit });
  });
  
  // Add standard API rate limit
  routeRateLimits.push({ pattern: '/api', method: '*', limit: apiStandardLimit });
  
  // Register all the rate limits at the plugin level instead of using hooks
  routeRateLimits.forEach(route => {
    const routeOptions = {
      method: route.method,
      url: route.pattern,
      config: {
        rateLimit: route.limit
      }
    };
    
    // Register the rate limit with the plugin
    try {
      fastify.rateLimit(routeOptions);
    } catch (err) {
      fastify.logger.error(`Failed to register rate limit for route: ${JSON.stringify(routeOptions)}`, err);
    }
  });
  
  fastify.logger.info('Rate limiting plugin configured successfully');
}

module.exports = fp(rateLimitPlugin, { name: 'rateLimit', dependencies: ['redis', 'logger'] });