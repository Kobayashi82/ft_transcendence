'use strict'

const { registerSchema } = require('../../schemas/register')

async function registerRoutes(fastify, options) {
  // POST /auth/register - Registrar un nuevo usuario
  fastify.post('/register', {
    schema: registerSchema,
  }, async (request, reply) => {
    try {
      const { email, username, password, device_info } = request.body
      
      // Validar fortaleza de la contraseña
      const passwordCheck = fastify.authTools.validatePassword(password)
      if (!passwordCheck.valid) {
        fastify.logger.warn(`Intento de registro con contraseña débil: ${email}`, {
          email,
          reason: passwordCheck.reason,
          ip: request.ip
        })
        
        reply.code(400).send({ 
          error: 'Contraseña débil', 
          message: passwordCheck.reason
        })
        return
      }
      
      // Sanitizar datos de entrada
      const sanitizedUsername = fastify.security.sanitizeInput(username)
      
      // Verificar si el email ya existe
      const existingUser = await fastify.authDB.getUserByEmail(email)
      if (existingUser) {
        fastify.logger.warn(`Intento de registro con email existente: ${email}`, {
          email,
          ip: request.ip
        })
        
        reply.code(409).send({ 
          error: 'Conflicto', 
          message: 'El email ya está registrado' 
        })
        return
      }

      // Verificar si el nombre de usuario ya existe
      try {
        const existingUserName = await fastify.db.get('SELECT id FROM users WHERE username = ?', [sanitizedUsername], 'users')
        if (existingUserName) {
          fastify.logger.warn(`Intento de registro con nombre de usuario existente: ${sanitizedUsername}`, {
            username: sanitizedUsername,
            ip: request.ip
          })
          
          reply.code(409).send({ 
            error: 'Conflicto', 
            message: 'El nombre de usuario ya está en uso. Por favor, elija otro.' 
          })
          return
        }
      } catch (err) {
        // Error al verificar el nombre de usuario
        fastify.logger.error(`Error al verificar nombre de usuario: ${err.message}`, {
          error: err.message,
          stack: err.stack,
          username: sanitizedUsername
        })
        // Continuamos con el flujo, ya que SQLite devolverá un error si hay duplicación
      }
      
      // Generar hash de contraseña
      const passwordHash = await fastify.authTools.hashPassword(password)
      
      // Extraer información del dispositivo si existe
      const deviceId = device_info?.id || fastify.authTools.generateUUID();
      const deviceName = device_info?.name || request.headers['user-agent'] || 'Unknown Device';
      const deviceType = device_info?.type || 'browser';
      
      // Crear usuario
      try {
        const user = await fastify.authDB.createUser({
          email,
          username: sanitizedUsername,
          password_hash: passwordHash,
          account_type: 'local'
        })
        
        // Generar tokens
        const accessToken = fastify.authTools.generateJWT(user)
        const refreshToken = fastify.authTools.generateRefreshToken()
        const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
        const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 900; // 15 minutos por defecto
        
        // Almacenar token de refresco con información del dispositivo
        await fastify.authDB.createRefreshToken(
          user.id, 
          refreshToken, 
          refreshExpiresIn,
          deviceId,
          deviceName,
          deviceType
        )
        
        // Crear sesión
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
        
        fastify.logger.info(`Registro exitoso para usuario: ${user.id}`, {
          userId: user.id,
          email: user.email,
          ip: request.ip,
          deviceId
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
        reply.code(201).send({
          access_token: accessToken,
          expires_in: accessExpiresIn,
          token_type: 'Bearer',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            roles: user.roles,
            has_2fa: false
          }
        })
      } catch (err) {
        // Mejorar el manejo de errores para duplicación de nombre de usuario
        if (err.message.includes('UNIQUE constraint failed: users.username')) {
          fastify.logger.warn(`Conflicto de nombre de usuario en registro: ${sanitizedUsername}`, {
            username: sanitizedUsername,
            error: err.message,
            ip: request.ip
          })
          
          reply.code(409).send({ 
            error: 'Conflicto', 
            message: 'El nombre de usuario ya está en uso. Por favor, elija otro.' 
          })
        } else if (err.message.includes('UNIQUE constraint failed: users.email')) {
          fastify.logger.warn(`Conflicto de email en registro: ${email}`, {
            email,
            error: err.message,
            ip: request.ip
          })
          
          reply.code(409).send({ 
            error: 'Conflicto', 
            message: 'El email ya está registrado' 
          })
        } else {
          // Otros errores
          throw err;
        }
      }
    } catch (err) {
      fastify.logger.error(`Error en registro: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        path: request.url
      })
      
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al registrar usuario' 
      })
    }
  })
}

module.exports = registerRoutes
