'use strict'

const fp = require('fastify-plugin')

async function jwtPlugin(fastify, options) {
  // Registrar plugin JWT
  await fastify.register(require('@fastify/jwt'), {
    secret: fastify.config.jwt.secret,
    sign: {
      expiresIn: fastify.config.jwt.expiresIn
    }
  })
  
  // Decorar con middleware de verificación
  fastify.decorate('verifyJWT', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: err.message })
      return false
    }
    return true
  })
  
  // Verificar si un token está en la lista negra (Redis)
  fastify.decorate('isBlacklisted', async (token) => {
    const blacklisted = await fastify.cache.exists(`blacklist:${token}`)
    return blacklisted === 1
  })
  
  // Hooks para verificar token en todas las rutas, excepto las públicas
  fastify.addHook('onRequest', async (request, reply) => {
    // Rutas públicas que no requieren autenticación
    const publicRoutes = [
      '/login',
      '/register',
      '/oauth',
      '/password/reset',
      '/password/reset-request',
      '/health',
      '/metrics'
    ]
    
    // Si la ruta es pública, continuar
    if (publicRoutes.some(route => request.routeOptions?.url?.includes(route))) {
      return
    }
    
    // Verificar JWT
    try {
      await request.jwtVerify()
      
      // Verificar si el token está en la lista negra
      const token = request.headers.authorization?.split(' ')[1]
      if (token && await fastify.isBlacklisted(token)) {
        throw new Error('Token revocado')
      }
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: err.message })
      return reply
    }
  })
}

module.exports = fp(jwtPlugin, { name: 'jwt', dependencies: ['redis'] })
