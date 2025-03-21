'use strict'

// Definition of microservices
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
    prefix: '/auth',
    timeout: 5000,
  },

  user: {
    url: process.env.USER_SERVICE_URL || 'http://user:3000',
    prefix: '/user',
    timeout: 5000,
  }, 
};

// Route map to redirect to specific services
const routeMap = {
  '/user': 'user',
  '/auth': 'auth',
};

module.exports = { services, routeMap }
