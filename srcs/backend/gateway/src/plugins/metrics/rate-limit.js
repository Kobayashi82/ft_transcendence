'use strict'

module.exports = (promClient, serviceName) => {

  // Limits reached
  const rateLimitHits = new promClient.Counter({
    name: `${serviceName}_rate_limit_hits_total`,
    help: 'Total rate limit hits',
    labelNames: ['client_ip', 'route']
  })

  // Requests blocked due to rate limiting
  const rateLimitBlocked = new promClient.Counter({
    name: `${serviceName}_rate_limit_blocked_total`,
    help: 'Total requests blocked due to rate limiting',
    labelNames: ['client_ip', 'route']
  })

  // Current rate limiting state (useful to see if you're close to the limit)
  const rateLimitState = new promClient.Gauge({
    name: `${serviceName}_rate_limit_current`,
    help: 'Current rate limit state (requests within time window)',
    labelNames: ['client_ip', 'route']
  })

  return {
    rateLimitHits,
    rateLimitBlocked,
    rateLimitState,
    
    recordHit: (clientIp, route) => {
      rateLimitHits.inc({ client_ip: clientIp, route })
    },
    
    recordBlocked: (clientIp, route) => {
      rateLimitBlocked.inc({ client_ip: clientIp, route })
    },
    
    updateState: (clientIp, route, count) => {
      rateLimitState.set({ client_ip: clientIp, route }, count)
    }
  }
}
