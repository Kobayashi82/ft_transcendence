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
  
  // Microservice-specific metrics
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
  
  const externalCallsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_external_calls_total`,
    help: 'Total calls to external services',
    labelNames: ['service', 'endpoint', 'status_code'],
    registers: [register]
  })
  
  const externalCallDuration = new promClient.Histogram({
    name: `${fastify.config.serviceName}_external_call_duration_seconds`,
    help: 'Duration of external service calls in seconds',
    labelNames: ['service', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
    registers: [register]
  })
  
  // Business metrics (placeholder - to be customized per microservice)
  const businessOperationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_business_operations_total`,
    help: 'Total business operations',
    labelNames: ['operation', 'status'],
    registers: [register]
  })
  
  // Decorate fastify instance with metrics
  fastify.decorate('metrics', { 
    register,
    http: {
      requestsTotal: httpRequestsTotal,
      requestDuration: httpRequestDuration
    },
    db: {
      recordOperation: (operation, entity, status) => {
        dbOperationsTotal.inc({ operation, entity, status })
      },
      recordDuration: (operation, entity, seconds) => {
        dbOperationDuration.observe({ operation, entity }, seconds)
      }
    },
    external: {
      recordCall: (service, endpoint, statusCode) => {
        externalCallsTotal.inc({ service, endpoint, status_code: statusCode })
      },
      recordDuration: (service, endpoint, seconds) => {
        externalCallDuration.observe({ service, endpoint }, seconds)
      }
    },
    business: {
      recordOperation: (operation, status) => {
        businessOperationsTotal.inc({ operation, status })
      }
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
  
  // Helper function to measure DB operation duration
  fastify.decorate('measureDbOperation', async (operation, entity, fn) => {
    const startTime = process.hrtime()
    try {
      const result = await fn()
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      fastify.metrics.db.recordOperation(operation, entity, 'success')
      fastify.metrics.db.recordDuration(operation, entity, duration)
      
      return result
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      fastify.metrics.db.recordOperation(operation, entity, 'error')
      fastify.metrics.db.recordDuration(operation, entity, duration)
      
      throw error
    }
  })
  
  // Helper function to measure external service call duration
  fastify.decorate('measureExternalCall', async (service, endpoint, fn) => {
    const startTime = process.hrtime()
    try {
      const response = await fn()
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      const statusCode = response.statusCode || response.status || '200'
      
      fastify.metrics.external.recordCall(service, endpoint, statusCode.toString())
      fastify.metrics.external.recordDuration(service, endpoint, duration)
      
      return response
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      fastify.metrics.external.recordCall(service, endpoint, 'error')
      fastify.metrics.external.recordDuration(service, endpoint, duration)
      
      throw error
    }
  })
  
  // Expose endpoint for Prometheus metrics
  fastify.get('/metrics', async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })
}

module.exports = fp(metricsPlugin, { name: 'metrics' })
