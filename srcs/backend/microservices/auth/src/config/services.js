'use strict'

// Definition of microservices
const services = {
  gateway: {
    url: process.env.GATEWAY_URL || 'http://gateway:3000',
    prefix: '/gateway',
    timeout: 5000,
  }
};

// Route map to redirect to specific services
const routeMap = {
  '/gateway': 'gateway'
};

module.exports = { services, routeMap }
