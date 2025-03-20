'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

async function metricsPlugin(fastify, options) {
  // Crear el registro para métricas de Prometheus
  const register = new promClient.Registry()
  
  // Agregar métricas por defecto
  promClient.collectDefaultMetrics({ 
    register,
    prefix: 'gateway_' 
  })
  
  // Crear contadores personalizados para el gateway
  const httpRequestsTotal = new promClient.Counter({
    name: 'gateway_http_requests_total',
    help: 'Total de solicitudes HTTP en el gateway',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  })
  
  const httpRequestDuration = new promClient.Histogram({
    name: 'gateway_http_request_duration_seconds',
    help: 'Duración de las solicitudes HTTP en segundos en el gateway',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  })
  
  // Métricas específicas del gateway para proxying
  const proxyRequestsTotal = new promClient.Counter({
    name: 'gateway_proxy_requests_total',
    help: 'Total de solicitudes proxeadas por servicio',
    labelNames: ['service', 'method', 'status_code'],
    registers: [register]
  })
  
  const proxyRequestDuration = new promClient.Histogram({
    name: 'gateway_proxy_latency_seconds',
    help: 'Latencia de solicitudes proxeadas por servicio',
    labelNames: ['service', 'method'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
  })
  
  const proxyErrors = new promClient.Counter({
    name: 'gateway_proxy_errors_total',
    help: 'Total de errores en solicitudes proxeadas por servicio',
    labelNames: ['service', 'method', 'error_code'],
    registers: [register]
  })
  
  // Decorar Fastify con el registro de Prometheus y utilidades
  fastify.decorate('metrics', {
    register,
    httpRequestsTotal,
    httpRequestDuration
  })
  
  // Decorador para métricas específicas de proxy
  fastify.decorate('proxyMetrics', {
    recordRequest: (service, method, statusCode) => {
      proxyRequestsTotal.inc({
        service, 
        method, 
        status_code: statusCode
      })
    },
    recordLatency: (service, method, seconds) => {
      proxyRequestDuration.observe({
        service,
        method
      }, seconds)
    },
    recordError: (service, method, errorCode) => {
      proxyErrors.inc({
        service,
        method,
        error_code: errorCode
      })
    }
  })
  
  // Hook para registrar métricas en cada solicitud
  fastify.addHook('onRequest', (request, reply, done) => {
    request.metrics = {
      startTime: process.hrtime()
    }
    done()
  })
  
  // Hook para registrar métricas de respuesta
  fastify.addHook('onResponse', (request, reply, done) => {
    // Usar routeOptions.url en lugar de routerPath (deprecated)
    const route = request.routeOptions?.url || request.raw.url
    const method = request.raw.method
    const statusCode = reply.statusCode.toString()
    
    // Incrementar contador de solicitudes
    fastify.metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    })
    
    // Usar elapsedTime en lugar de getResponseTime() (deprecated)
    const responseTimeInSeconds = reply.elapsedTime / 1000 // convertir de ms a segundos
    
    fastify.metrics.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode
      },
      responseTimeInSeconds
    )
    
    // Métricas de proxy si es una solicitud proxeada
    if (request.headers['x-gateway-service']) {
      const service = request.headers['x-gateway-service']
      
      fastify.proxyMetrics.recordRequest(service, method, statusCode)
      fastify.proxyMetrics.recordLatency(service, method, responseTimeInSeconds)
      
      // Si es un error, registrarlo también
      if (reply.statusCode >= 400) {
        fastify.proxyMetrics.recordError(service, method, statusCode)
      }
    }
    
    done()
  })
  
  // Exponer endpoint para métricas de Prometheus
  fastify.get('/metrics', async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })
  
  fastify.log.info('Métricas de Prometheus disponibles en /metrics')
}

module.exports = fp(metricsPlugin, {
  name: 'metrics',
  dependencies: ['logger']
})