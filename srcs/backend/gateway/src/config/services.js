'use strict'

// Definition of microservices
const services = {
  user: {
    url: process.env.USER_SERVICE_URL || 'http://user:3000',
    prefix: '/user',
    routes: {
      // Here you can map specific routes if needed
    },
    // Timeout in milliseconds
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000'),
    // Proxy options
    proxyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        // Here you can modify headers if necessary
        return headers;
      }
    }
  },
  
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
    prefix: '/auth',
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000'),
  },
};

// Route map to redirect to specific services
// This will be used in the proxy plugin to determine which service to route each request to
const routeMap = {
  '/user': 'user',
  '/auth': 'auth',
};

module.exports = { services, routeMap }
