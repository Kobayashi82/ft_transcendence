'use strict'

// Archivo principal que registra todas las rutas de autenticación
async function authRoutes(fastify, options) {
  // Registrar las rutas separadas por funcionalidad
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
