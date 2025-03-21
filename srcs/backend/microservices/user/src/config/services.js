'use strict'

// Definition of microservices
const services = {
  gateway: {
    url: process.env.GATEWAY_URL || 'http://gateway:3000',
    prefix: '/gateway',
    timeout: 5000,
  },

  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
    prefix: '/auth',
    routes: {
      '/login': '/login',
      '/register': '/register',
      '/verify': '/verify',
      '/logout': '/logout',
      '/reset-password': '/reset-password',
      '/change-password': '/change-password',
      '/me': '/me'
    },
    timeout: 5000,
    proxyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        return headers;
      }
    }
  },

  user: {
    url: process.env.USER_SERVICE_URL || 'http://user:3000',
    prefix: '/user',
    routes: {
      '/profile': '/profile',
      '/settings': '/settings',
      '/:id': '/:id'
    },
    timeout: 5000,
    proxyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        return headers;
      }
    }
  }
};

// Route map to redirect to specific services
const routeMap = {
  '/auth': 'auth',
  '/user': 'user',
  '/gateway': 'gateway'
};

module.exports = { services, routeMap }
