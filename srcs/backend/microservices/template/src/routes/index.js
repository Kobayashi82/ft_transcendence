'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { 
      service: 'template',
      status: 'running',
      version: '1.0.0'
    }
  })
})