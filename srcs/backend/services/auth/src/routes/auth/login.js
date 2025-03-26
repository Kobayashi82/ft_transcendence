'use strict'

const { loginSchema } = require('../../schemas/login')

async function loginRoutes(fastify, options) {

  fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
    try {
      const { email, password, device_info } = request.body

      // Verificar si la cuenta está bloqueada
      if (await fastify.security.account.isLocked(email)) {
        fastify.logger.warn(`Intento de login a cuenta bloqueada: ${email}`, {
          ip: request.ip,
          email
        })

        reply.code(401).send({ 
          error: 'Cuenta bloqueada', 
          message: 'La cuenta está temporalmente bloqueada por múltiples intentos fallidos. Intente más tarde o restablezca su contraseña.' 
        })
        return
      }

      // Buscar usuario por email
      const user = await fastify.authDB.getUserByEmail(email)

      // Verificar usuario
      if (!user || user.account_type !== 'local') {
        // Incrementar contador de intentos fallidos
        await fastify.security.account.incrementFailedAttempts(email)

        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Credenciales inválidas' 
        })
        return
      }

      // Verificar contraseña
      const passwordValid = await fastify.authTools.comparePassword(password, user.password_hash)
      if (!passwordValid) {
        // Incrementar contador de intentos fallidos
        await fastify.security.account.incrementFailedAttempts(email)

        fastify.logger.warn(`Intento de login con contraseña incorrecta: ${email}`, {
          ip: request.ip,
          userId: user.id,
          email
        })

        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'Credenciales inválidas' 
        })
        return
      }

      // Resetear contador de intentos fallidos
      await fastify.security.account.resetFailedAttempts(email)

      // Verificar si el usuario está activo
      if (!user.is_active) {
        fastify.logger.warn(`Intento de login a cuenta inactiva: ${email}`, {
          ip: request.ip,
          userId: user.id,
          email
        })

        reply.code(401).send({ 
          error: 'No autorizado', 
          message: 'La cuenta está desactivada' 
        })
        return
      }

      // Si el usuario tiene 2FA, generar un token temporal y pedir verificación
      if (user.has_2fa) {
        // Generar token temporal (válido por 5 minutos)
        const tempToken = fastify.jwt.sign(
          { 
            sub: user.id, 
            email: user.email, 
            temp: true,
            exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
          }
        )

        fastify.logger.info(`Solicitud de verificación 2FA para usuario: ${user.id}`, {
          userId: user.id,
          email: user.email,
          ip: request.ip
        })

        reply.code(200).send({
          requires_2fa: true,
          temp_token: tempToken,
          message: 'Se requiere verificación de dos factores'
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
      
      // Tiempo de expiración del token de refresco en segundos
      const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
      
      // Tiempo de expiración del token de acceso en segundos
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

      fastify.logger.info(`Login exitoso para usuario: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: request.ip,
        deviceId: deviceId
      })

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
      fastify.logger.error(`Error en login: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        path: request.url
      })

      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al iniciar sesión' 
      })
    }
  })
}

module.exports = loginRoutes
