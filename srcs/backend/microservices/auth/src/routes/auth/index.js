'use strict'

async function authRoutes(fastify, options) {
  fastify.register(require('./login'))
  fastify.register(require('./register'))
  fastify.register(require('./token'))
  fastify.register(require('./twoFactor'))
  fastify.register(require('./profile'))
  fastify.register(require('./logout'))
  fastify.register(require('./oauth_google'))
  fastify.register(require('./oauth_fortytwo'))
}

module.exports = authRoutes
