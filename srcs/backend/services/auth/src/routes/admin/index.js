'use strict'

// Plugin principal para rutas administrativas
async function adminRoutes(fastify, options) {
  // Registrar los sub-módulos de administración
  fastify.register(require('./users')) // Rutas para gestión de usuarios
  fastify.register(require('./middleware')) // Middleware compartido para rutas admin
}

module.exports = adminRoutes
