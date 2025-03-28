'use strict'

module.exports = {
  name: 'auth',
  url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
  prefix: '/auth',
  routes: {
    '/login': {
      method: ['POST', 'GET'],
      path: '/login',
      roles: []
    },
    '/logout': {
      method: ['POST'],
      path: '/logout',
      roles: ['user']
    },
    '/register': {
      method: ['POST'],
      path: '/register',
      roles: []
    },
    '/validate': {
      method: ['GET'],
      path: '/validate',
      roles: []
    },
    '/refresh': {
      method: ['POST'],
      path: '/refresh',
      roles: []
    },
    '/oauth/google/init': {
      method: ['GET'],
      path: '/oauth/google/init',
      roles: []
    },
    '/oauth/google/callback': {
      method: ['GET'],
      path: '/oauth/google/callback',
      roles: []
    },
    '/oauth/42/init': {
      method: ['GET'],
      path: '/oauth/42/init',
      roles: []
    },
    '/oauth/42/callback': {
      method: ['GET'],
      path: '/oauth/42/callback',
      roles: []
    },
    '/me': {
      method: ['GET'],
      path: '/me',
      roles: []
    },
    '/2fa/verify': {
      method: ['POST'],
      path: '/2fa/verify',
      roles: ['user']
    },
    '/2fa/enable': {
      method: ['POST'],
      path: '/2fa/enable',
      roles: ['user']
    },
    '/2fa/disable': {
      method: [],
      path: '/2fa/disable',
      roles: ['user']
    },
    '/password/reset-request': {
      method: [],
      path: '/password/reset-request',
      roles: []
    },
    '/password/reset': {
      method: [],
      path: '/password/reset',
      roles: []
    },
    '/password/change': {
      method: [],
      path: '/password/change',
      roles: ['user']
    },
    '/internal/health': {
      method: ['GET'],
      path: '/internal/health',
      roles: []
    },
    '/openapi': {
      method: ['GET'],
      path: '/openapi',
      roles: []
    }
  },
  timeout: 5000,
}
