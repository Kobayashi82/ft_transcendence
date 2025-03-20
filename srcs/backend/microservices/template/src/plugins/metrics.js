'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

async function metricsPlugin(fastify, options) {
  // Crear el registro para métricas de Prometheus
  const register = new promClient.Registry()
  
  // Agregar métricas por defecto
  promClient.collectDefaultMetrics({ register })
  
  // Crear contadores personalizados
  const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total de solicitudes HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  })
  
  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las solicitudes HTTP en segundos',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  })
  
  // Decorar Fastify con el registro de Prometheus
  fastify.decorate('metrics', {
    register,
    httpRequestsTotal,
    httpRequestDuration
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
    // Usar request.routeOptions.url en lugar de request.routerPath
    const route = request.routeOptions?.url || request.raw.url
    const method = request.raw.method
    const statusCode = reply.statusCode.toString()
    
    // Incrementar contador de solicitudes
    fastify.metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    })
    
    // Usar reply.elapsedTime en lugar de calcular manualmente
    const responseTimeInSeconds = reply.elapsedTime / 1000 // convertir de ms a segundos
    
    fastify.metrics.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode
      },
      responseTimeInSeconds
    )
    
    done()
  })
  
  // Exponer endpoint para métricas de Prometheus
  fastify.get(options.metrics.endpoint, async (request, reply) => {
    return reply
      .header('Content-Type', register.contentType)
      .send(await register.metrics())
  })
  
  fastify.log.info(`Métricas de Prometheus disponibles en ${options.metrics.endpoint}`)
}

module.exports = fp(metricsPlugin, {
  name: 'metrics',
  dependencies: []
})