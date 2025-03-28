'use strict'

const fp = require('fastify-plugin')
const authLimits = require('./auth')
const apiLimits = require('./api')

// Common key generators
const keyGenerators = {
  byIP: (req) => req.ip,
  
  byEmailAndIP: (req) => {
    const email = req.body && req.body.email ? req.body.email : 'anonymous'
    return `${req.ip}:login:${email}`
  },
  
  byUserId: (req) => {
    const userId = req.auth && req.auth.userId ? req.auth.userId : 'anonymous'
    return `user:${userId}`
  },
  
  byIPAndRoute: (req) => `${req.ip}:${req.url}`
}

async function rateLimitPlugin(fastify, options) {
  fastify.decorate('keyGenerators', keyGenerators)
  
  // Get specific rate limits for routes
  const routeRateLimits = [
    ...authLimits.getRateLimits(fastify),
    ...apiLimits.getRateLimits(fastify)
  ]

  // Configure global rate-limit
  await fastify.register(require('@fastify/rate-limit'), {
    trustProxy: true,
    global: true,
    max: 100,
    timeWindow: 60 * 1000,
    redis: fastify.redis,
    
    // Add standard headers
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    },
    
    // Generate keys per request
    keyGenerator: (req) => {
      for (const route of routeRateLimits) {       
        if ((route.method === '*' || route.method === req.method) && req.url.startsWith(route.pattern))
          return route.limit.keyGenerator(req)
      } 
      return req.ip
    },

    // Determine max requests per request
    max: (req, key) => {
      for (const route of routeRateLimits) {       
        if ((route.method === '*' || route.method === req.method) && req.url.startsWith(route.pattern))
          return route.limit.max
      } 
      return 100
    },

    // Determine time window per request
    timeWindow: async (req, key) => {
      for (const route of routeRateLimits) {
        if ((route.method === '*' || route.method === req.method) && req.url.startsWith(route.pattern))
          return route.limit.timeWindow * 1000
      } 
      return 60 * 1000
    },
    
    // Log when limit is exceeded
    onExceeded: (req) => {     
      for (const route of routeRateLimits) {       
        if ((route.method === '*' || route.method === req.method) && req.url.startsWith(route.pattern)) {
          // Record rate limit blocked metric
          if (fastify.metrics && fastify.metrics.rateLimit) {
            fastify.metrics.rateLimit.recordBlocked(req.ip, route.pattern)
          }

          fastify.logger.warn(`Rate-Limit: Request from ${req.ip} to ${req.method} ${req.url} blocked. Limit of ${route.limit.max} requests in ${route.limit.timeWindow} seconds exceeded.`)
          return
        }
      }
      // Record rate limit blocked metric for global limit
      if (fastify.metrics && fastify.metrics.rateLimit) {
        fastify.metrics.rateLimit.recordBlocked(req.ip, req.url)
      }

      fastify.logger.warn(`Rate-Limit: Request from ${req.ip} to ${req.method} ${req.url} blocked. Limit of 100 requests in 60 seconds exceeded.`)
      return
    },
    
    // Response for rate limit exceeded
    errorResponseBuilder: (req, context) => {
      let message = `Too many requests. Please try again in ${context.after} seconds.`;
      
      // Check for specific route rate limits
      for (const route of routeRateLimits) {
        if ((route.method === '*' || route.method === req.method) && req.url.startsWith(route.pattern)) {
          message = `Rate limit exceeded for ${route.pattern}. Please try again in ${context.after} seconds.`;
          break;
        }
      }
      
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: message
      };
    },

    // Hook that fires on each request to track rate limit state
    onHit: (req, key, value, next) => {
      let route = null;
      let limit = 100;
      let pattern = req.url;
      
      for (const r of routeRateLimits) {
        if ((r.method === '*' || r.method === req.method) && req.url.startsWith(r.pattern)) {
          route = r;
          limit = r.limit.max;
          pattern = r.pattern;
          break;
        }
      }
      
      // Record hit metric
      if (fastify.metrics && fastify.metrics.rateLimit) {
        fastify.metrics.rateLimit.recordHit(req.ip, pattern)
        
        // Also update current state
        if (typeof value === 'number') {
          const remaining = limit - value;
          if (remaining >= 0) {
            fastify.metrics.rateLimit.updateState(req.ip, pattern, value)
          }
        }
      }
      
      next()
    }
  })

}

module.exports = fp(rateLimitPlugin, { name: 'rate-limit', dependencies: ['@fastify/redis', 'metrics', 'logger'] })
