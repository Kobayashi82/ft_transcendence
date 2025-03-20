'use strict'

const fp = require('fastify-plugin')

/**
 * Plugin para manejar autenticación en el gateway
 * Esto puede variar según la implementación específica del proyecto
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones del plugin
 */
async function authPlugin(fastify, options) {
  const config = fastify.config
  
  // Este es un decorador básico que se puede expandir según las necesidades del proyecto
  fastify.decorate('authenticateRequest', async function(request, reply) {
    try {
      // Verificar si la petición incluye un token de autenticación
      const authHeader = request.headers.authorization
      
      if (!authHeader) {
        return { authenticated: false, error: 'Token no proporcionado' }
      }
      
      // Verificar el formato del token (Bearer token)
      const parts = authHeader.split(' ')
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return { authenticated: false, error: 'Formato de autenticación inválido' }
      }
      
      const token = parts[1]
      
      // Aquí deberías implementar la lógica de verificación del token
      // Por ejemplo, verificar un JWT o consultar un servicio de autenticación
      
      // Este es un ejemplo básico, ajustar según la implementación real
      if (token === 'invalid-token') {
        return { authenticated: false, error: 'Token inválido' }
      }
      
      // Si llegamos aquí, el token es válido
      // Puedes decodificar el token JWT, consultar información de usuario, etc.
      return { 
        authenticated: true,
        user: {
          // Información del usuario obtenida del token o servicio
          id: 'user-id',
          roles: ['user']
        }
      }
      
    } catch (error) {
      fastify.log.error(error, 'Error en autenticación')
      return { authenticated: false, error: 'Error en autenticación' }
    }
  })

  // Middleware para rutas protegidas (opcional)
  fastify.decorate('authenticate', async function(request, reply) {
    const result = await this.authenticateRequest(request, reply)
    
    if (!result.authenticated) {
      reply.status(401).send({ 
        statusCode: 401,
        error: 'Unauthorized',
        message: result.error || 'Autenticación requerida'
      })
      return
    }
    
    // Añadir información del usuario a la solicitud
    request.user = result.user
  })
}

module.exports = fp(authPlugin, {
  name: 'auth',
  dependencies: ['redis', 'logger']
})