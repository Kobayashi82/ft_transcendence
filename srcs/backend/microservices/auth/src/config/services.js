'use strict'

// Definition of microservices
const services = {
  gateway: {
    url: process.env.GATEWAY_URL,
    timeout: 5000
  }
};

module.exports = { services }
