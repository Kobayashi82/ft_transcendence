'use strict'

function getRateLimits(fastify) {
  const kg = fastify.keyGenerators;
  
  const authLoginLimit = {
    max: 30,
    timeWindow: '5 minutes',
    keyGenerator: kg.byEmailAndIP
  };
  
  const authRegisterLimit = {
    max: 5,
    timeWindow: '15 minutes',
    keyGenerator: kg.byIP
  };
  
  const authPasswordResetLimit = {
    max: 3,
    timeWindow: '30 minutes',
    keyGenerator: kg.byEmailAndIP
  };
  
  const authOauthLimit = {
    max: 10,
    timeWindow: '5 minutes',
    keyGenerator: kg.byIP
  };
  
  const authValidateLimit = {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: kg.byIPAndRoute
  };
  
  const rateLimits = []

  rateLimits.push({ pattern: '/auth/login', method: 'POST', limit: authLoginLimit })
  rateLimits.push({ pattern: '/auth/register', method: 'POST', limit: authRegisterLimit })
  rateLimits.push({ pattern: '/auth/password/reset', method: 'POST', limit: authPasswordResetLimit })
  rateLimits.push({ pattern: '/auth/oauth/google/init', method: 'GET', limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/42/init', method: 'GET', limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/google/callback', method: 'GET', limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/42/callback', method: 'GET', limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/validate', method: 'GET', limit: authValidateLimit })

  return rateLimits
}

module.exports = { getRateLimits };