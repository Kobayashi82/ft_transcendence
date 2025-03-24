'use strict'

const { loginSchema } = require('../../schemas/login')

async function logoutRoutes(fastify, options) {
  // POST /auth/logout - Cerrar sesión
  fastify.post('/logout', async (request, reply) => {
    try {
      // Intentar obtener el token de autorización
      const authHeader = request.headers.authorization
      let token = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      // Obtener token de refresco de cookies
      const refreshToken = request.cookies.refresh_token || 
                          (request.body && request.body.refresh_token);

      // Añadir token a la lista negra en Redis si existe
      if (token) {
        try {
          // Obtener expiración del token
          const decoded = fastify.jwt.decode(token)
          if (decoded && decoded.exp) {
            const ttl = decoded.exp - Math.floor(Date.now() / 1000)
            if (ttl > 0) {
              await fastify.cache.set(`blacklist:${token}`, '1', ttl)
            }
          }
        } catch (err) {
          fastify.logger.error(`Error al decodificar token: ${err.message}`)
        }
      }

      // Revocar token de refresco si se proporciona
      if (refreshToken) {
        try {
          await fastify.authDB.revokeRefreshToken(refreshToken)
        } catch (err) {
          fastify.logger.error(`Error al revocar token de refresco: ${err.message}`)
        }
      }

      // Limpiar cookies
      reply
        .clearCookie('refresh_token', { 
          path: '/api/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
        .clearCookie('session_active', {
          path: '/'
        });

      reply.send({ success: true })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al cerrar sesión' 
      })
    }
  })
}

module.exports = logoutRoutes
