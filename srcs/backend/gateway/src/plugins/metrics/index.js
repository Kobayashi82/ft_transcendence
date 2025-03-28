'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

const proxyMetrics = require('./proxy')
const securityMetrics = require('./security')
const rateLimitMetrics = require('./rate-limit')
const loggingMetrics = require('./logging')
const healthMetrics = require('./health')

async function metricsPlugin(fastify, options) {
  const register = new promClient.Registry()
  const serviceName = fastify.config.serviceName

  // Register default Node.js metrics  
  promClient.collectDefaultMetrics({ register, prefix: `${serviceName}_` })
  
  // Initialize metric modules
  const proxy = proxyMetrics(promClient, serviceName)
  const security = securityMetrics(promClient, serviceName)
  const rateLimit = rateLimitMetrics(promClient, serviceName)
  const logging = loggingMetrics(promClient, serviceName)
  const health = healthMetrics(promClient, serviceName)
  
  // Register all metrics in the global registry
  register.registerMetric(proxy.proxyRequestsTotal)
  register.registerMetric(proxy.proxyLatency)
  register.registerMetric(proxy.httpErrors)
  register.registerMetric(proxy.connectionErrors)
  register.registerMetric(proxy.methodNotAllowed)
  
  register.registerMetric(security.unauthorizedAccess)
  register.registerMetric(security.authErrors)
  register.registerMetric(security.roleChecks)
  
  register.registerMetric(rateLimit.rateLimitHits)
  register.registerMetric(rateLimit.rateLimitBlocked)
  register.registerMetric(rateLimit.rateLimitState)
  
  register.registerMetric(logging.logsProcessed)
  register.registerMetric(logging.logsSentToLogstash)
  register.registerMetric(logging.logSendFailures)
  register.registerMetric(logging.logBatchSize)

  register.registerMetric(health.healthChecks)
  register.registerMetric(health.healthCheckDuration)

  fastify.decorate('metrics', {
    register,
    proxy,
    security,
    rateLimit,
    logging
  })
  
  // Add hook for basic request/response metrics
  fastify.addHook('onRequest', (request, reply, done) => {
    request.metrics = { startTime: process.hrtime() }
    done()
  })
  
  fastify.addHook('onResponse', (request, reply, done) => {
    const route = request.routeOptions?.url || request.raw.url
    const method = request.raw.method
    const statusCode = reply.statusCode.toString()
    const responseTimeInSeconds = reply.elapsedTime / 1000
    
    // Record basic HTTP metrics
    if (statusCode >= 400) {
      fastify.metrics.proxy.recordHttpError('gateway', method, statusCode, route)
    }
    
    // Record proxy metrics if it's a proxied request
    const targetService = request.headers['x-target']
    if (targetService) {
      fastify.metrics.proxy.recordRequest(targetService, method, statusCode)
      fastify.metrics.proxy.recordLatency(targetService, method, responseTimeInSeconds)
    }
    
    done()
  })
  
  // Endpoint to expose metrics to Prometheus
  fastify.get('/internal/metrics', async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })
}

module.exports = fp(metricsPlugin, { name: 'metrics' })
