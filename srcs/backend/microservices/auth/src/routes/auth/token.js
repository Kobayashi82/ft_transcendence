'use strict'

const { refreshTokenSchema, validateTokenSchema } = require('../../schemas/token')

async function tokenRoutes(fastify, options) {
  // GET /auth/validate - Validar token
  fastify.get('/validate', {
    schema: validateTokenSchema,
  }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ 
          valid: false,
          error: 'No autorizado', 
          message: 'Token no proporcionado' 
        })
        return
      }
  
      const token = authHeader.split(' ')[1]
  
      // Verificar si el token está en la lista negra
      if (await fastify.isBlacklisted(token)) {
        reply.code(401).send({ 
          valid: false,
          error: 'No autorizado', 
          message: 'Token revocado' 
        })
        return
      }
  
      // Verificar token
      let decoded
      try {
        decoded = fastify.jwt.verify(token)
      } catch (err) {
        reply.code(401).send({ 
          valid: false,
          error: 'No autorizado', 
          message: err.message 
        })
        return
      }
  
      // Verificar usuario
      const user = await fastify.authDB.getUserById(decoded.sub)
      if (!user || !user.is_active) {
        reply.code(401).send({ 
          valid: false,
          error: 'No autorizado', 
          message: 'Usuario no encontrado o inactivo' 
        })
        return
      }
  
      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)
  
      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos
  
      reply.send({
        valid: true,
        user_info: userInfo
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        valid: false,
        error: 'Error interno', 
        message: 'Error al validar token' 
      })
    }
  })

  // POST /auth/refresh - Refrescar token
  fastify.post('/refresh', {
    schema: refreshTokenSchema,
  }, async (request, reply) => {
    try {
      // Intentar obtener el token de refresco primero de las cookies
      let refreshToken = request.cookies.refresh_token;
      
      // Si no está en cookies, buscar en el cuerpo de la solicitud (para compatibilidad)
      if (!refreshToken && request.body && request.body.refresh_token) {
        refreshToken = request.body.refresh_token
      }
      
      if (!refreshToken) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Token de refresco no proporcionado' 
        })
        return
      }

      // Verificar token de refresco
      const tokenData = await fastify.authDB.getRefreshToken(refreshToken)
      if (!tokenData) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Token de refresco inválido o expirado' 
        })
        return
      }

      // Obtener usuario
      const user = await fastify.authDB.getUserById(tokenData.user_id)
      if (!user || !user.is_active) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Usuario no encontrado o inactivo' 
        })
        return
      }

      // Verificar si el dispositivo coincide
      const deviceId = request.body.device_id || tokenData.device_id;
      if (tokenData.device_id && tokenData.device_id !== deviceId) {
        fastify.logger.warn(`Intento de usar refresh token desde un dispositivo diferente: ${user.id}`, {
          userId: user.id,
          tokenDeviceId: tokenData.device_id,
          requestDeviceId: deviceId
        });
      }

      // Revocar token actual
      await fastify.authDB.revokeRefreshToken(refreshToken)

      // Generar nuevos tokens
      const accessToken = fastify.authTools.generateJWT(user)
      const newRefreshToken = fastify.authTools.generateRefreshToken()
      
      // Tiempo de expiración del token de refresco en segundos
      const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
      
      // Tiempo de expiración del token de acceso en segundos
      const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 3600; // 1 hora por defecto

      // Almacenar nuevo token de refresco con la misma información de dispositivo
      await fastify.authDB.createRefreshToken(
        user.id, 
        newRefreshToken, 
        refreshExpiresIn,
        deviceId,
        tokenData.device_name,
        tokenData.device_type
      )

      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)

      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos

      // Establecer cookie HttpOnly para el nuevo refresh token
      reply
        .setCookie('refresh_token', newRefreshToken, {
          path: '/api/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: refreshExpiresIn
        })
        // Actualizar la cookie de sesión activa
        .setCookie('session_active', 'true', {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: refreshExpiresIn
        });

      // Responder con nuevos tokens
      reply.send({
        access_token: accessToken,
        expires_in: accessExpiresIn,
        token_type: 'Bearer',
        user: userInfo
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al refrescar token' 
      })
    }
  })
}

module.exports = tokenRoutes
