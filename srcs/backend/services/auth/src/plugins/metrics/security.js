'use strict'


module.exports = (promClient, serviceName) => {

  // Security events counter (https redirects, oversized responses, etc.)
  const securityEvents = new promClient.Counter({
    name: `${serviceName}_security_events_total`,
    help: 'Total security-related events',
    labelNames: ['event_type', 'source']
  })

  // Response size tracking
  const responseSize = new promClient.Histogram({
    name: `${serviceName}_response_size_bytes`,
    help: 'Size of responses in bytes',
    labelNames: ['url'],
    buckets: [1024, 10240, 102400, 1048576, 5242880, 10485760]
  })

  // Unauthorized access attempts
  const unauthorizedAccess = new promClient.Counter({
    name: `${serviceName}_unauthorized_access_total`,
    help: 'Total unauthorized access attempts',
    labelNames: ['route', 'ip_address']
  })

  // Authentication errors
  const authErrors = new promClient.Counter({
    name: `${serviceName}_auth_errors_total`,
    help: 'Total authentication errors',
    labelNames: ['error_type']
  })

  // Role verifications
  const roleChecks = new promClient.Counter({
    name: `${serviceName}_role_checks_total`,
    help: 'Total role checks performed',
    labelNames: ['route', 'result']
  })

  const authSuccess = new promClient.Counter({
    name: `${serviceName}_auth_success_total`,
    help: 'Total successful authentications',
    labelNames: ['route']
  })

  return {
    securityEvents,
    responseSize,
    unauthorizedAccess,
    authErrors,
    roleChecks,
    authSuccess,
    
    recordSecurityEvent: (eventType, source, metadata = {}) => {
      securityEvents.inc({ event_type: eventType, source })
    },
    
    recordResponseSize: (url, sizeInBytes) => {
      responseSize.observe({ url }, sizeInBytes)
    },

    recordUnauthorizedAccess: (route, ipAddress) => {
      unauthorizedAccess.inc({ route, ip_address: ipAddress })
    },
    
    recordAuthError: (errorType) => {
      authErrors.inc({ error_type: errorType })
    },
    
    recordRoleCheck: (route, result) => {
      roleChecks.inc({ route, result })
    },

    recordAuthSuccess: (route) => {
      authSuccess.inc({ route })
    }
  }
}
