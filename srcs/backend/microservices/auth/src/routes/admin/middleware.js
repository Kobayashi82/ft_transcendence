'use strict'

// Middleware para verificar permisos de administrador
async function adminMiddleware(fastify, options) {
  // Decorador para verificar que el usuario es administrador
  fastify.decorate('verifyAdmin', async function(request, reply) {
    try {
      await fastify.verifyJWT(request, reply)
      
      // Verificar roles en el token JWT
      if (!request.user.roles || !request.user.roles.includes('admin')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Acceso denegado: se requiere rol de administrador'
        })
        return false
      }
      
      return true
    } catch (err) {
      return false
    }
  })
}

module.exports = adminMiddleware
