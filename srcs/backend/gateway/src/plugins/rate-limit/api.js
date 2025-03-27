'use strict'

function getRateLimits(fastify) {
  const kg = fastify.keyGenerators;
  
  const apiSensitiveLimit = {
    max: 30,
    timeWindow: 10,
    keyGenerator: kg.byIP
  };
  
  const apiStandardLimit = {
    max: 30,
    timeWindow: 10,
    keyGenerator: kg.byIP
  };

  const monitoringLimit = {
    max: 300,
    timeWindow: 10,
    keyGenerator: kg.byIP
  };
  
  const rateLimits = []
  
  // Add sensitive routes
  rateLimits.push({ pattern: '/auth',   method: '*', limit: apiSensitiveLimit })
  rateLimits.push({ pattern: '/admin',  method: '*', limit: apiSensitiveLimit })
  rateLimits.push({ pattern: '/user',   method: '*', limit: apiSensitiveLimit })

  // Add monitoring routes
  rateLimits.push({ pattern: '/internal/health',     method: '*', limit: monitoringLimit })
  rateLimits.push({ pattern: '/internal/metrics',    method: '*', limit: monitoringLimit })
  rateLimits.push({ pattern: '/internal/logs',       method: '*', limit: monitoringLimit })
  rateLimits.push({ pattern: '/internal/logs/batch', method: '*', limit: monitoringLimit })

  // Add standard routes
  rateLimits.push({ pattern: '/', method: '*', limit: apiStandardLimit })
  
  return rateLimits
}

module.exports = { getRateLimits };
