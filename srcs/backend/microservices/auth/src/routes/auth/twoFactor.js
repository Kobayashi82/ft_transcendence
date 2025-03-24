'use strict'

const { verify2FASchema } = require('../../schemas/twoFactor')

async function twoFactorRoutes(fastify, options) {
  // POST /auth/2fa/verify - Verificar código 2FA
  fastify.post('/2fa/verify', {
    schema: verify2FASchema
  }, async (request, reply) => {
    try {
      const { code, token, device_info } = request.body
      
      // Verificar token temporal
      let decoded
      try {
        decoded = fastify.jwt.verify(token)
      } catch (err) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Token inválido o expirado' 
        })
        return
      }
      
      // Verificar que es un token temporal
      if (!decoded.temp) {
        reply.code(400).send({ 
          error: 'Solicitud incorrecta', 
          message: 'Token no válido para verificación 2FA' 
        })
        return
      }
      
      // Obtener usuario
      const user = await fastify.authDB.getUserById(decoded.sub)
      if (!user) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Usuario no encontrado' 
        })
        return
      }
      
      // Obtener configuración 2FA activa
      const config2FA = await fastify.authDB.get2FAConfig(user.id, 'app')
      if (!config2FA) {
        reply.code(400).send({ 
          error: 'Solicitud incorrecta', 
          message: 'No hay configuración 2FA para este usuario' 
        })
        return
      }
      
      // Verificar código
      const isValid = fastify.authTools.verifyTOTP(code, config2FA.secret)
      if (!isValid) {
        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Código 2FA inválido' 
        })
        return
      }
      
      // Extraer información del dispositivo
      const deviceId = device_info?.id || fastify.authTools.generateUUID();
      const deviceName = device_info?.name || request.headers['user-agent'] || 'Unknown Device';
      const deviceType = device_info?.type || 'browser';
      
      // Actualizar último login
      await fastify.authDB.updateLastLogin(user.id)
      
      // Generar tokens
      const accessToken = fastify.authTools.generateJWT(user)
      const refreshToken = fastify.authTools.generateRefreshToken()
      
      // Tiempo de expiración
      const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
      const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 3600; // 1 hora por defecto
      
      // Almacenar token de refresco
      await fastify.authDB.createRefreshToken(
        user.id, 
        refreshToken, 
        refreshExpiresIn,
        deviceId,
        deviceName,
        deviceType
      )

      // Registrar sesión
      await fastify.authDB.createSession(
        user.id,
        fastify.authTools.generateUUID(),
        request.ip,
        deviceName,
        refreshExpiresIn,
        deviceId
      )

      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)

      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos
      
      // Establecer cookie HttpOnly para el refresh token
      reply
        .setCookie('refresh_token', refreshToken, {
          path: '/api/auth',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: refreshExpiresIn // en segundos
        })
        // Establecer la cookie de sesión activa
        .setCookie('session_active', 'true', {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: refreshExpiresIn 
        });

      // Responder con tokens y datos de usuario
      reply.send({
        access_token: accessToken,
        expires_in: accessExpiresIn,
        token_type: 'Bearer',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          has_2fa: user.has_2fa
        }
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al verificar código 2FA' 
      })
    }
  })
}

module.exports = twoFactorRoutes
