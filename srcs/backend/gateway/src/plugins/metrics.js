'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

async function metricsPlugin(fastify, options) {
  const register = new promClient.Registry()
  
  // Default metrics
  promClient.collectDefaultMetrics({ register, prefix: `${fastify.config.serviceName}_` })
  
  // Custom counters
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
  
  // Gateway-specific metrics for proxying
  const proxyRequestsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_proxy_requests_total`,
    help: 'Total proxied requests per service',
    labelNames: ['service', 'method', 'status_code'],
    registers: [register]
  })
  
  const proxyRequestDuration = new promClient.Histogram({
    name: `${fastify.config.serviceName}_proxy_latency_seconds`,
    help: 'Latency of proxied requests per service',
    labelNames: ['service', 'method'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
  })
  
  const proxyErrors = new promClient.Counter({
    name: `${fastify.config.serviceName}_proxy_errors_total`,
    help: 'Total errors in proxied requests per service',
    labelNames: ['service', 'method', 'error_code'],
    registers: [register]
  })
  
  fastify.decorate('metrics', { register, httpRequestsTotal, httpRequestDuration })
  fastify.decorate('proxyMetrics', {
    recordRequest: (service, method, statusCode) => { proxyRequestsTotal.inc({ service, method, status_code: statusCode }) },
    recordLatency: (service, method, seconds) => { proxyRequestDuration.observe({ service, method }, seconds) },
    recordError: (service, method, errorCode) => { proxyErrors.inc({ service, method, error_code: errorCode }) }
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
    fastify.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode })
    const responseTimeInSeconds = (reply.elapsedTime / 1000)
    
    fastify.metrics.httpRequestDuration.observe({ method, route, status_code: statusCode }, responseTimeInSeconds)
    
    // Proxy metrics if it's a proxied request
    if (request.headers['x-gateway-service']) {
      const service = request.headers['x-gateway-service']
      
      fastify.proxyMetrics.recordRequest(service, method, statusCode)
      fastify.proxyMetrics.recordLatency(service, method, responseTimeInSeconds)
      
      // If it's an error, register it as well
      if (reply.statusCode >= 400) { fastify.proxyMetrics.recordError(service, method, statusCode) }
    }
    
    done()
  })
  
  // Expose endpoint for Prometheus metrics
  fastify.get('/metrics', async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })

}

module.exports = fp(metricsPlugin, { name: 'metrics' })
