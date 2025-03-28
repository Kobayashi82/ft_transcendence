'use strict'

module.exports = (promClient, serviceName) => {

  // Request volume per service
  const proxyRequestsTotal = new promClient.Counter({
    name: `${serviceName}_proxy_requests_total`,
    help: 'Total proxied requests per service',
    labelNames: ['service', 'method', 'status_code']
  })

  // Latency per service
  const proxyLatency = new promClient.Histogram({
    name: `${serviceName}_proxy_latency_seconds`,
    help: 'Latency of proxied requests per service',
    labelNames: ['service', 'method'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  })

  // HTTP errors (4xx, 5xx) per service
  const httpErrors = new promClient.Counter({
    name: `${serviceName}_http_errors_total`,
    help: 'Total HTTP errors by service and status code',
    labelNames: ['service', 'method', 'status_code', 'route']
  })

  // Connection errors (timeout, refused, etc.)
  const connectionErrors = new promClient.Counter({
    name: `${serviceName}_connection_errors_total`,
    help: 'Total connection errors by service and error type',
    labelNames: ['service', 'method', 'error_type']
  })

  // Requests with incorrect HTTP method
  const methodNotAllowed = new promClient.Counter({
    name: `${serviceName}_method_not_allowed_total`,
    help: 'Total requests with incorrect HTTP method',
    labelNames: ['route', 'method', 'allowed_methods']
  })
  
  return {
    proxyRequestsTotal,
    proxyLatency,
    httpErrors,
    connectionErrors,
    methodNotAllowed,
    
    recordRequest: (service, method, statusCode) => {
      proxyRequestsTotal.inc({ service, method, status_code: statusCode })
    },
    
    recordLatency: (service, method, seconds) => {
      proxyLatency.observe({ service, method }, seconds)
    },
    
    recordHttpError: (service, method, statusCode) => {
      httpErrors.inc({ service, method, status_code: statusCode, route })
    },
    
    recordConnectionError: (service, method, errorType) => {
      connectionErrors.inc({ service, method, error_type: errorType })
    },

    recordMethodNotAllowed: (route, method, allowedMethods) => {
      methodNotAllowed.inc({ route, method, allowed_methods: allowedMethods.join(',') })
    }
  }
}
