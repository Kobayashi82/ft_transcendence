'use strict'

function getRateLimits(fastify) {
  const kg = fastify.keyGenerators;
  
  const apiSensitiveLimit = {
    max: 30,
    timeWindow: '1 minute',
    keyGenerator: kg.byIP
  };
  
  const apiStandardLimit = {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: kg.byIP
  };
  
  const rateLimits = []
  
  // Add sensitive routes
  const sensitivePatterns = ['/api/user', '/api/admin', '/api/auth']
  sensitivePatterns.forEach(pattern => {
    rateLimits.push({ pattern, method: '*', limit: apiSensitiveLimit })
  });
  
  // Add standard limit for API
  rateLimits.push({ pattern: '/api', method: '*', limit: apiStandardLimit })
  
  return rateLimits
}

module.exports = { getRateLimits };
