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
  
  // Decorar con middleware de verificación mejorado
  fastify.decorate('verifyJWT', async (request, reply) => {
    try {
      await request.jwtVerify()
      
      // Verificar si el token está en la lista negra
      const token = request.headers.authorization?.split(' ')[1]
      if (token && await fastify.isBlacklisted(token)) {
        throw new Error('Token revocado')
      }
      
      // Verificar si el usuario está activo
      const userId = request.user.sub
      const userKey = `user:${userId}:info`
      
      // Intentar obtener de caché
      let user = await fastify.cache.get(userKey)
      
      // Si no está en caché, obtener de la base de datos
      if (!user) {
        user = await fastify.authDB.getUserById(userId)
        
        if (user) {
          // Almacenar en caché
          const userInfo = fastify.authTools.createUserInfo(user)
          await fastify.cache.set(userKey, userInfo, 1800) // 30 minutos
        }
      }
      
      // Verificar si el usuario existe y está activo
      if (!user || !user.is_active) {
        fastify.logger.warn(`Intento de acceso con token de usuario inactivo: ${userId}`, {
          userId,
          path: request.url,
          method: request.method,
          ip: request.ip
        })
        
        throw new Error('Usuario inactivo o no encontrado')
      }
      
      // Loggear acceso exitoso para auditoría
      fastify.logger.debug(`Acceso verificado para usuario ${userId}: ${request.method} ${request.url}`, {
        userId,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
    } catch (err) {
      fastify.logger.warn(`Verificación JWT fallida: ${err.message}`, {
        error: err.message,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
      reply.code(401).send({
        error: 'No autorizado',
        message: err.message
      })
      return false
    }
    return true
  })
  
  // Verificar si un token está en la lista negra (Redis)
  fastify.decorate('isBlacklisted', async (token) => {
    try {
      const blacklisted = await fastify.cache.exists(`blacklist:${token}`)
      return blacklisted === 1
    } catch (err) {
      fastify.logger.error(`Error al verificar token en lista negra: ${err.message}`, {
        error: err.message
      })
      // En caso de error, permitir el acceso (más seguro permitir y loggear que bloquear incorrectamente)
      return false
    }
  })
  
  // Revocar un token específico
  fastify.decorate('revokeToken', async (token, expiresIn = null) => {
    try {
      // Decodificar el token para obtener su expiración
      const decoded = fastify.jwt.decode(token)
      
      // Si se proporciona expiresIn, usar ese valor
      // Si no, calcular basado en la expiración del token
      const ttl = expiresIn || (decoded && decoded.exp 
        ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) 
        : 3600) // 1 hora por defecto
      
      // Añadir a la lista negra
      await fastify.cache.set(`blacklist:${token}`, '1', ttl)
      
      fastify.logger.info(`Token revocado exitosamente`, {
        jti: decoded?.jti,
        userId: decoded?.sub,
        ttl
      })
      
      return true
    } catch (err) {
      fastify.logger.error(`Error al revocar token: ${err.message}`, {
        error: err.message
      })
      throw err
    }
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
      '/metrics',
      '/'  // Ruta raíz (info del servicio)
    ]
    
    // Si la ruta es pública, continuar
    if (publicRoutes.some(route => request.routeOptions?.url?.startsWith(route) || request.url.startsWith(route))) {
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
      fastify.logger.warn(`Acceso denegado a ruta protegida: ${request.url}`, {
        error: err.message,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
      reply.code(401).send({ error: 'No autorizado', message: err.message })
      return reply
    }
  })
  
  fastify.logger.info('JWT plugin configurado correctamente')
}

module.exports = fp(jwtPlugin, { name: 'jwt', dependencies: ['redis'] })