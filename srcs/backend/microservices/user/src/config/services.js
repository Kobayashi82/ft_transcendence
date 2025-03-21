'use strict'

// Definition of microservices
const services = {
  auth: {
    name: 'auth',
    host: process.env.AUTH_SERVICE_HOST || 'auth',
    port: process.env.AUTH_SERVICE_PORT || 3000,
    healthCheck: '/health'
  },
  gateway: {
    name: 'gateway',
    host: process.env.GATEWAY_HOST || 'gateway',
    port: process.env.GATEWAY_PORT || 3000,
    healthCheck: '/health'
  }
}

// Route map to redirect to specific services
const routeMap = [
  {
    prefix: '/auth',
    service: services.auth,
    routes: [
      '/login',
      '/register',
      '/verify',
      '/logout',
      '/reset-password',
      '/change-password'
    ]
  }
]

module.exports = { services, routeMap }
