'use strict'

function getRateLimits(fastify) {
  const kg = fastify.keyGenerators;
  
  const authLoginLimit = {
    max: 10,
    timeWindow: 20,
    keyGenerator: kg.byEmailAndIP
  };
  
  const authRegisterLimit = {
    max: 5,
    timeWindow: 60 * 15,
    keyGenerator: kg.byIP
  };
  
  const authPasswordResetLimit = {
    max: 3,
    timeWindow: 60 * 30,
    keyGenerator: kg.byEmailAndIP
  };
  
  const authOauthLimit = {
    max: 10,
    timeWindow: 60 * 5,
    keyGenerator: kg.byIP
  };
  
  const authValidateLimit = {
    max: 100,
    timeWindow: 60,
    keyGenerator: kg.byIPAndRoute
  };
  
  const rateLimits = []

  rateLimits.push({ pattern: '/auth/login',                 method: 'GET',  limit: authLoginLimit })
  rateLimits.push({ pattern: '/auth/register',              method: 'POST', limit: authRegisterLimit })
  rateLimits.push({ pattern: '/auth/validate',              method: 'GET',  limit: authValidateLimit })
  rateLimits.push({ pattern: '/auth/oauth/google/init',     method: 'GET',  limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/42/init',         method: 'GET',  limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/google/callback', method: 'GET',  limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/oauth/42/callback',     method: 'GET',  limit: authOauthLimit })
  rateLimits.push({ pattern: '/auth/password/reset',        method: 'POST', limit: authPasswordResetLimit })

  return rateLimits
}

module.exports = { getRateLimits };
