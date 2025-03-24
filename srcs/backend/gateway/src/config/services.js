'use strict'

const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
    prefix: '/auth',
    routes: {
      '/login': '/login',
      '/register': '/register',
      '/refresh': '/refresh',
      '/validate': '/validate',
      '/logout': '/logout',
      '/me': '/me',
      '/oauth/google/init': '/oauth/google/init',
      '/oauth/google/callback': '/oauth/google/callback',
      '/oauth/42/init': '/oauth/42/init',
      '/oauth/42/callback': '/oauth/42/callback',
      '/2fa/enable': '/2fa/enable',
      '/2fa/verify': '/2fa/verify',
      '/2fa/disable': '/2fa/disable',
      '/password/reset-request': '/password/reset-request',
      '/password/reset': '/password/reset',
      '/password/change': '/password/change'
    },
    timeout: 5000,
  },

  user: {
    url: process.env.USER_SERVICE_URL || 'http://user:3000',
    prefix: '/user',
    timeout: 5000,
  }, 
};

const routeMap = {
  '/auth': 'auth',
  '/user': 'user',
};

module.exports = { services, routeMap }
