'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

async function metricsPlugin(fastify, options) {
  const register = new promClient.Registry()
  
  // Default metrics
  promClient.collectDefaultMetrics({ register, prefix: `${fastify.config.serviceName}_` })
  
  // Custom counters for auth service
  const httpRequestsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_http_requests_total`,
    help: `Total HTTP requests in the ${fastify.config.serviceName}`,
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  })
  
  const httpRequestDuration = new promClient.Histogram({
    name: `${fastify.config.serviceName}_http_request_duration_seconds`,
    help: `Duration of HTTP requests in seconds in the ${fastify.config.serviceName}`,
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  })
  
  // Auth-specific metrics
  const loginAttemptsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_login_attempts_total`,
    help: 'Total login attempts',
    labelNames: ['status', 'method'],
    registers: [register]
  })
  
  const registrationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_registrations_total`,
    help: 'Total user registrations',
    labelNames: ['status', 'method'],
    registers: [register]
  })
  
  const tokenValidationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_token_validations_total`,
    help: 'Total token validations',
    labelNames: ['status'],
    registers: [register]
  })
  
  const twoFactorAuthTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_2fa_attempts_total`,
    help: 'Total 2FA verification attempts',
    labelNames: ['status', 'type'],
    registers: [register]
  })
  
  const activeUsersGauge = new promClient.Gauge({
    name: `${fastify.config.serviceName}_active_users`,
    help: 'Number of active users',
    registers: [register]
  })
  
  // Database metrics
  const dbOperationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_db_operations_total`,
    help: 'Total database operations',
    labelNames: ['operation', 'entity', 'status'],
    registers: [register]
  })
  
  const dbOperationDuration = new promClient.Histogram({
    name: `${fastify.config.serviceName}_db_operation_duration_seconds`,
    help: 'Duration of database operations in seconds',
    labelNames: ['operation', 'entity'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5],
    registers: [register]
  })
  
  const activeSessionsGauge = new promClient.Gauge({
    name: `${fastify.config.serviceName}_active_sessions`,
    help: 'Number of active user sessions',
    registers: [register]
  })
  
  const tokenOperationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_token_operations_total`,
    help: 'Total token operations',
    labelNames: ['operation', 'type'],
    registers: [register]
  })

  const securityEventsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_security_events_total`,
    help: 'Total security events',
    labelNames: ['type', 'status'],
    registers: [register]
  })

  fastify.decorate('metrics', { 
    register,
    http: {
      requestsTotal: httpRequestsTotal,
      requestDuration: httpRequestDuration
    },
    auth: {
      loginAttempts: (status, method = 'local') => { loginAttemptsTotal.inc({ status, method })},
      registrations: (status, method = 'local') => { registrationsTotal.inc({ status, method })},
      tokenValidations: (status) => { tokenValidationsTotal.inc({ status })},
      twoFactorAuth: (status, type = 'app') => { twoFactorAuthTotal.inc({ status, type })},
      setActiveUsers: (count) => { activeUsersGauge.set(count)},
      setActiveSessions: (count) => { activeSessionsGauge.set(count)},
      recordTokenOperation: (operation, type) => { tokenOperationsTotal.inc({ operation, type })},
      recordSecurityEvent: (type, status) => { securityEventsTotal.inc({ type, status })}  
    },
    db: {
      recordOperation: (operation, entity, status) => { dbOperationsTotal.inc({ operation, entity, status })},
      recordDuration: (operation, entity, seconds) => { dbOperationDuration.observe({ operation, entity }, seconds)}
    }
  })
  
  // Hook to register metrics for each request
  fastify.addHook('onRequest', (request, reply, done) => {
    request.metrics = { startTime: process.hrtime() }
    done()
  })
  
  // Hook to register response metrics
  fastify.addHook('onResponse', (request, reply, done) => {
    const route = request.routeOptions?.url || request.raw.url
    const method = request.raw.method
    const statusCode = reply.statusCode.toString()
    
    // Increment request counter
    fastify.metrics.http.requestsTotal.inc({ method, route, status_code: statusCode })
    const responseTimeInSeconds = (reply.elapsedTime / 1000)
    
    fastify.metrics.http.requestDuration.observe({ method, route, status_code: statusCode }, responseTimeInSeconds)
    
    done()
  })
  
  // Configure periodic metrics update (every 1 minute)
  setInterval(async () => {
    try {
      // Actived users
      const activeUsers = await fastify.db.get('SELECT COUNT(*) as count FROM users WHERE is_active = true AND is_deleted = false')
      if (activeUsers && activeUsers.count) {
        fastify.metrics.auth.setActiveUsers(activeUsers.count)
      }
      
      // Actived sessions
      const activeSessions = await fastify.db.get('SELECT COUNT(*) as count FROM sessions WHERE revoked = false AND expires_at > CURRENT_TIMESTAMP')
      if (activeSessions && activeSessions.count) {
        fastify.metrics.auth.setActiveSessions(activeSessions.count)
      }
    } catch (err) {
      fastify.logger.error(`Error updating metrics: ${err.message}`)
    }
  }, 60000);
  
  // Expose endpoint for Prometheus metrics
  fastify.get('/metrics', async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })
}

module.exports = fp(metricsPlugin, { name: 'metrics' })
