'use strict'

module.exports = (promClient, serviceName) => {

  // Health check results
  const healthChecks = new promClient.Counter({
    name: `${serviceName}_health_checks_total`,
    help: 'Total health check results',
    labelNames: ['component', 'status']
  })

  // Health check duration
  const healthCheckDuration = new promClient.Histogram({
    name: `${serviceName}_health_check_duration_seconds`,
    help: 'Duration of health checks in seconds',
    labelNames: ['component'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  })

  // Health check errors
  const healthCheckErrors = new promClient.Counter({
    name: `${serviceName}_health_check_errors_total`,
    help: 'Total health check errors',
    labelNames: ['component', 'error_type']
  })

  return {
    healthChecks,
    healthCheckDuration,
    healthCheckErrors,
    
    recordHealthCheck: (component, isHealthy) => {
      healthChecks.inc({ 
        component, 
        status: isHealthy ? 'healthy' : 'unhealthy' 
      })
    },

    recordHealthCheckDuration: (component, seconds) => {
      healthCheckDuration.observe({ component }, seconds)
    },

    recordHealthCheckError: (component, errorType) => {
      healthCheckErrors.inc({ component, error_type: errorType })
    }
  }
}
