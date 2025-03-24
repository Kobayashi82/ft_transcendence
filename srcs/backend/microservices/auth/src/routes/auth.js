'use strict'

const { 
  loginSchema, 
  registerSchema,
  refreshTokenSchema,
  validateTokenSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verify2FASchema,
  enable2FASchema,
  oauthCallbackSchema
} = require('../schemas/auth')

// Rutas para la API de autenticación
async function authRoutes(fastify, options) {
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
          refresh_token: refreshToken, // Para compatibilidad con clientes antiguos
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

  // POST /auth/login - Iniciar sesión
  fastify.post('/login', {
    schema: loginSchema,
  }, async (request, reply) => {
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
        deviceId
      })

      // Establecer cookie HttpOnly para el refresh token
      // Esto la hace segura contra ataques XSS
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
        refresh_token: refreshToken, // Para compatibilidad con clientes antiguos
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
        refresh_token: refreshToken, // Para compatibilidad
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
        refresh_token: newRefreshToken, // Para compatibilidad con clientes antiguos
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

  // POST /auth/password/reset-request - Solicitar reseteo de contraseña
  fastify.post('/password/reset-request', {
    schema: resetPasswordRequestSchema,
  }, async (request, reply) => {
    try {
      const { email } = request.body

      // Verificar si el email existe
      const user = await fastify.authDB.getUserByEmail(email)

      // No revelar si el email existe o no por razones de seguridad
      if (!user) {
        reply.send({
          success: true,
          message: 'Si el email existe, se ha enviado un enlace para restablecer la contraseña'
        })
        return
      }

      // Generar token de reseteo
      const resetToken = fastify.authTools.generateRandomToken(32)

      // Guardar token en la base de datos (válido por 1 hora)
      await fastify.authDB.createPasswordResetToken(user.id, resetToken, 3600)

      // En un sistema real, aquí se enviaría un email con un enlace
      // que contiene el token para restablecer la contraseña

      reply.send({
        success: true,
        message: 'Si el email existe, se ha enviado un enlace para restablecer la contraseña'
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al solicitar reseteo de contraseña' 
      })
    }
  })

  // POST /auth/password/reset - Resetear contraseña
  fastify.post('/password/reset', {
    schema: resetPasswordSchema
  }, async (request, reply) => {
    try {
      const { token, password, device_info } = request.body

      // Verificar token
      const resetData = await fastify.authDB.getPasswordResetToken(token)
      if (!resetData) {
        reply.code(400).send({ 
          error: 'Solicitud incorrecta', 
          message: 'Token inválido o expirado' 
        })
        return
      }

      // Validar fortaleza de la contraseña
      const passwordCheck = fastify.authTools.validatePassword(password)
      if (!passwordCheck.valid) {
        reply.code(400).send({ 
          error: 'Contraseña débil', 
          message: passwordCheck.reason
        })
        return
      }

      // Generar nuevo hash de contraseña
      const passwordHash = await fastify.authTools.hashPassword(password)

// Extraer información del dispositivo si existe
const deviceId = device_info?.id || fastify.authTools.generateUUID();
const deviceName = device_info?.name || request.headers['user-agent'] || 'Unknown Device';
const deviceType = device_info?.type || 'browser';

// Actualizar contraseña
await fastify.authDB.updateUser(resetData.user_id, { password_hash: passwordHash })

// Marcar token como usado
await fastify.authDB.usePasswordResetToken(token)

// Revocar todos los tokens de refresco para este usuario
await fastify.authDB.revokeAllRefreshTokens(resetData.user_id)

// Revocar todas las sesiones para este usuario
await fastify.authDB.revokeAllSessions(resetData.user_id)

// Desbloquear cuenta si estaba bloqueada
if (fastify.security && fastify.security.account) {
  const user = await fastify.authDB.getUserById(resetData.user_id)
  if (user) {
    await fastify.security.account.unlock(user.email)
    
    // Generar un nuevo token de acceso y un nuevo refresh token
    const accessToken = fastify.authTools.generateJWT(user)
    const refreshToken = fastify.authTools.generateRefreshToken()
    
    // Tiempos de expiración
    const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
    const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 3600; // 1 hora por defecto
    
    // Almacenar nuevo token de refresco
    await fastify.authDB.createRefreshToken(
      user.id, 
      refreshToken, 
      refreshExpiresIn,
      deviceId,
      deviceName,
      deviceType
    )
    
    // Establecer cookie HttpOnly para el refresh token
    reply
      .setCookie('refresh_token', refreshToken, {
        path: '/api/auth',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshExpiresIn
      })
      // Establecer la cookie de sesión activa
      .setCookie('session_active', 'true', {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshExpiresIn
      });
    
    // Incluir los tokens en la respuesta
    reply.send({
      success: true,
      message: 'Contraseña restablecida correctamente',
      access_token: accessToken,
      refresh_token: refreshToken,
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
    return
  }
}

// Respuesta si no se encontró usuario o no se pudo generar token
reply.send({
  success: true,
  message: 'Contraseña restablecida correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al resetear contraseña' 
})
}
})

// POST /auth/password/change - Cambiar contraseña (autenticado)
fastify.post('/password/change', {
schema: changePasswordSchema,
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const { current_password, new_password } = request.body
const userId = request.user.sub

// Obtener usuario
const user = await fastify.authDB.getUserById(userId)
if (!user) {
  reply.code(404).send({ 
    error: 'No encontrado', 
    message: 'Usuario no encontrado' 
  })
  return
}

// Verificar que la cuenta sea local
if (user.account_type !== 'local') {
  reply.code(400).send({ 
    error: 'Solicitud incorrecta', 
    message: 'No se puede cambiar la contraseña para cuentas OAuth' 
  })
  return
}

// Verificar contraseña actual
const passwordValid = await fastify.authTools.comparePassword(current_password, user.password_hash)
if (!passwordValid) {
  reply.code(400).send({ 
    error: 'Solicitud incorrecta', 
    message: 'Contraseña actual incorrecta' 
  })
  return
}

// Validar fortaleza de la nueva contraseña
const passwordCheck = fastify.authTools.validatePassword(new_password)
if (!passwordCheck.valid) {
  reply.code(400).send({ 
    error: 'Contraseña débil', 
    message: passwordCheck.reason
  })
  return
}

// Generar nuevo hash de contraseña
const passwordHash = await fastify.authTools.hashPassword(new_password)

// Actualizar contraseña
await fastify.authDB.updateUser(userId, { password_hash: passwordHash })

// Revocar todos los tokens de refresco excepto el actual
// Obtenemos el token actual de las cookies
const currentToken = request.cookies.refresh_token

if (currentToken) {
  // Obtener el ID del dispositivo actual
  const tokenData = await fastify.authDB.getRefreshToken(currentToken)
  const currentDeviceId = tokenData?.device_id
  
  // Revocar tokens de otros dispositivos
  if (currentDeviceId) {
    await fastify.authDB.revokeAllRefreshTokensExceptDevice(userId, currentDeviceId)
  } else {
    // Si no hay device ID, revocar todos excepto el token actual
    await fastify.authDB.revokeAllRefreshTokensExcept(userId, currentToken)
  }
} else {
  // Si no hay token en cookies, revocar todos
  await fastify.authDB.revokeAllRefreshTokens(userId)
}

reply.send({
  success: true,
  message: 'Contraseña cambiada correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al cambiar contraseña' 
})
}
})

// POST /auth/2fa/enable - Habilitar 2FA
fastify.post('/2fa/enable', {
schema: enable2FASchema,
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const { type, phone } = request.body
const userId = request.user.sub

// Obtener usuario
const user = await fastify.authDB.getUserById(userId)
if (!user) {
  reply.code(404).send({ 
    error: 'No encontrado', 
    message: 'Usuario no encontrado' 
  })
  return
}

// Generar secreto TOTP
const secret = fastify.authTools.generateTOTPSecret()

// Generar códigos de respaldo
const backupCodes = fastify.authTools.generateBackupCodes(10)

// Guardar en la base de datos
await fastify.authDB.createOrUpdate2FA(userId, type, secret, phone)

let response = {
  secret: secret,
  backup_codes: backupCodes
}

// Si es app, generar QR
if (type === 'app') {
  const qrcode = await fastify.authTools.generateTOTPQRCode(secret, user.email)
  response.qrcode = qrcode
}

reply.send(response)
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al habilitar 2FA' 
})
}
})

// POST /auth/2fa/verify-setup - Verificar configuración 2FA
fastify.post('/2fa/verify-setup', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const { code, type } = request.body
const userId = request.user.sub

// Obtener configuración 2FA
const config2FA = await fastify.authDB.get2FAConfig(userId, type)
if (!config2FA) {
  reply.code(400).send({ 
    error: 'Solicitud incorrecta', 
    message: 'No hay configuración 2FA para verificar' 
  })
  return
}

// Verificar código
const isValid = fastify.authTools.verifyTOTP(code, config2FA.secret)
if (!isValid) {
  reply.code(400).send({ 
    error: 'Solicitud incorrecta', 
    message: 'Código 2FA inválido' 
  })
  return
}

// Marcar como verificado y activado
await fastify.authDB.verify2FA(userId, type)
await fastify.authDB.enable2FA(userId, type)

reply.send({
  success: true,
  message: 'Verificación 2FA completada correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al verificar 2FA' 
})
}
})

// POST /auth/2fa/disable - Deshabilitar 2FA
fastify.post('/2fa/disable', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const userId = request.user.sub

// Desactivar 2FA
await fastify.authDB.disable2FA(userId)

reply.send({
  success: true,
  message: '2FA desactivado correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al desactivar 2FA' 
})
}
})

// GET /auth/me - Obtener información del usuario autenticado
fastify.get('/me', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const userId = request.user.sub

// Obtener usuario
const user = await fastify.authDB.getUserById(userId)
if (!user) {
  reply.code(404).send({ 
    error: 'No encontrado', 
    message: 'Usuario no encontrado' 
  })
  return
}

// Obtener sesiones activas
const sessions = await fastify.authDB.getActiveSessions(userId)

// Obtener dispositivos del usuario
const devices = await fastify.authDB.getUserDevices(userId)

reply.send({
  id: user.id,
  username: user.username,
  email: user.email,
  account_type: user.account_type,
  roles: user.roles,
  has_2fa: user.has_2fa,
  created_at: user.created_at,
  last_login: user.last_login,
  sessions: sessions.map(s => ({
    id: s.id,
    ip_address: s.ip_address,
    user_agent: s.user_agent,
    created_at: s.created_at,
    expires_at: s.expires_at,
    device_id: s.device_id
  })),
  devices: devices.map(d => ({
    id: d.device_id,
    name: d.device_name,
    type: d.device_type,
    last_used: d.last_used,
    login_count: d.login_count
  }))
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al obtener información del usuario' 
})
}
})

// DELETE /auth/sessions/:id - Revocar una sesión específica
fastify.delete('/sessions/:id', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const sessionId = parseInt(request.params.id)
const userId = request.user.sub

await fastify.authDB.revokeSession(sessionId, userId)

reply.send({
  success: true,
  message: 'Sesión revocada correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al revocar sesión' 
})
}
})

// DELETE /auth/devices/:deviceId - Revocar tokens y sesiones de un dispositivo
fastify.delete('/devices/:deviceId', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const deviceId = request.params.deviceId
const userId = request.user.sub

// Verificar que no estemos revocando el dispositivo actual
const currentToken = request.cookies.refresh_token
if (currentToken) {
  const tokenData = await fastify.authDB.getRefreshToken(currentToken)
  if (tokenData && tokenData.device_id === deviceId) {
    reply.code(400).send({
      error: 'Solicitud incorrecta',
      message: 'No se puede revocar el dispositivo actual. Use la función de logout en su lugar.'
    })
    return
  }
}

// Revocar todos los tokens y sesiones para este dispositivo
const tokensRevoked = await fastify.authDB.revokeRefreshTokensByDevice(userId, deviceId)

reply.send({
  success: true,
  message: `Dispositivo revocado correctamente. ${tokensRevoked} sesiones cerradas.`
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({
  error: 'Error interno',
  message: 'Error al revocar dispositivo'
})
}
})

// DELETE /auth/sessions - Revocar todas las sesiones excepto la actual
fastify.delete('/sessions', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const userId = request.user.sub

// Obtener el token de refresco actual
const currentToken = request.cookies.refresh_token

if (currentToken) {
  // Obtener información del dispositivo actual
  const tokenData = await fastify.authDB.getRefreshToken(currentToken)
  const currentDeviceId = tokenData?.device_id
  
  if (currentDeviceId) {
    // Revocar todas las sesiones excepto las del dispositivo actual
    await fastify.authDB.revokeAllSessionsExceptDevice(userId, currentDeviceId)
    
    reply.send({
      success: true,
      message: 'Todas las sesiones de otros dispositivos han sido revocadas'
    })
  } else {
    // Revocar todas las sesiones excepto la asociada al token actual
    await fastify.authDB.revokeAllSessionsExceptToken(userId, currentToken)
    
    reply.send({
      success: true,
      message: 'Todas las demás sesiones han sido revocadas'
    })
  }
} else {
  // Si no hay token actual, revocar todas las sesiones
  await fastify.authDB.revokeAllSessions(userId)
  
  reply.send({
    success: true,
    message: 'Todas las sesiones han sido revocadas'
  })
}
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al revocar sesiones' 
})
}
})

// DELETE /auth/user - Eliminar cuenta de usuario
fastify.delete('/user', {
preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
try {
const userId = request.user.sub

// Eliminar usuario (soft delete)
await fastify.authDB.deleteUser(userId)

// Añadir token actual a la lista negra
const token = request.headers.authorization?.split(' ')[1]
if (token) {
  const decoded = fastify.jwt.decode(token)
  if (decoded && decoded.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) {
      await fastify.cache.set(`blacklist:${token}`, '1', ttl)
    }
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

reply.send({
  success: true,
  message: 'Cuenta eliminada correctamente'
})
} catch (err) {
fastify.logger.error(err)
reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al eliminar cuenta' 
})
}
})

// GET /auth/oauth/google/callback - Google OAuth callback
fastify.get('/oauth/google/callback', {
schema: oauthCallbackSchema
}, async (request, reply) => {
try {
const { code, state, error } = request.query

// Verificar si hay error
if (error) {
  fastify.logger.warn(`Error en callback OAuth de Google: ${error}`, {
    error,
    state,
    ip: request.ip
  })
  
  reply.code(400).send({ 
    error: 'Error de autorización', 
    message: error 
  })
  return
}

// Verificar estado para prevenir CSRF
const stateData = await fastify.cache.get(`oauth:state:${state}`)
if (!stateData) {
  fastify.logger.warn(`Estado inválido en callback OAuth de Google: ${state}`, {
    state,
    ip: request.ip
  })
  
  reply.code(400).send({ 
    error: 'Estado inválido', 
    message: 'Posible ataque CSRF' 
  })
  return
}

// Extraer información del dispositivo del estado
let deviceId, deviceName = request.headers['user-agent'], deviceType = 'browser'

if (typeof stateData === 'object') {
  deviceId = stateData.deviceId
  deviceName = stateData.deviceName || deviceName
  deviceType = stateData.deviceType || deviceType
} else {
  // Estado simple - sólo proveedor
  deviceId = fastify.authTools.generateUUID()
}

// Eliminar estado usado
await fastify.cache.del(`oauth:state:${state}`)

const config = fastify.config.oauth.google

// Intercambiar código por token usando circuit breaker
let tokenResponse;
try {
  const response = await fastify.security.breakers.googleOAuth.fire({
    method: 'post',
    url: 'https://oauth2.googleapis.com/token',
    data: {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    },
    timeout: 5000
  });
  
  tokenResponse = response.data;
  
} catch (err) {
  fastify.logger.error(`Error en OAuth Google al obtener token: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    ip: request.ip
  });
  
  if (fastify.security.breakers.googleOAuth.status === 'open') {
    reply.code(503).send({
      error: 'Servicio no disponible',
      message: 'El servicio de autenticación de Google no está disponible temporalmente'
    });
  } else {
    reply.code(500).send({
      error: 'Error interno',
      message: 'Error en callback OAuth de Google'
    });
  }
  return;
}

// Obtener información del usuario usando circuit breaker
let userInfoResponse;
try {
  userInfoResponse = await fastify.security.breakers.googleOAuth.fire({
    method: 'get',
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}`
    },
    timeout: 5000
  });
} catch (err) {
  fastify.logger.error(`Error en OAuth Google al obtener información del usuario: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    ip: request.ip
  });
  
  reply.code(500).send({
    error: 'Error interno',
    message: 'Error al obtener información del usuario de Google'
  });
  return;
}

const userInfo = userInfoResponse.data

fastify.logger.info(`Información de usuario obtenida de Google OAuth: ${userInfo.email}`, {
  email: userInfo.email,
  googleId: userInfo.id,
  ip: request.ip
})

// Verificar si el usuario ya existe
let user = await fastify.authDB.getUserByOAuthId(userInfo.id, 'google')

if (!user) {
  // Si no existe, verificar si existe un usuario con el mismo email
  const existingUser = await fastify.authDB.getUserByEmail(userInfo.email)
  
  if (existingUser) {
    // Vincular cuenta existente con Google
    user = await fastify.authDB.updateUser(existingUser.id, {
      oauth_id: userInfo.id,
      account_type: existingUser.account_type === 'local' ? 'local' : 'google'
    })
    
    fastify.logger.info(`Cuenta existente vinculada con Google: ${existingUser.id}`, {
      userId: existingUser.id,
      email: userInfo.email,
      googleId: userInfo.id
    })
  } else {
    // Sanitizar username
    const sanitizedUsername = userInfo.name 
      ? fastify.security.sanitizeInput(userInfo.name) 
      : userInfo.email.split('@')[0]
    
    // Crear nuevo usuario
    user = await fastify.authDB.createUser({
      email: userInfo.email,
      username: sanitizedUsername,
      account_type: 'google',
      oauth_id: userInfo.id
    })
    
    fastify.logger.info(`Nuevo usuario creado desde Google OAuth: ${user.id}`, {
      userId: user.id,
      email: userInfo.email,
      googleId: userInfo.id
    })
  }
}

// Si el usuario tiene 2FA, generar un token temporal y pedir verificación
if (user.has_2fa) {
  // Generar token temporal (válido por 5 minutos)
  const tempToken = fastify.jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      temp: true,
      device_id: deviceId,
      device_name: deviceName,
      device_type: deviceType,
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
    }
  )
  
  fastify.logger.info(`2FA requerido para login con Google OAuth: ${user.id}`, {
    userId: user.id,
    email: user.email
  })
  
  // Redireccionar a la página de 2FA
  const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
  const redirectUrl = new URL(`https://${frontendHost}/2fa`);
  redirectUrl.searchParams.append('token', tempToken);
  redirectUrl.searchParams.append('provider', 'google');
  
  return reply.redirect(redirectUrl.toString());
}

// Actualizar último login
await fastify.authDB.updateLastLogin(user.id)

// Generar tokens
const accessToken = fastify.authTools.generateJWT(user)
const refreshToken = fastify.authTools.generateRefreshToken()

// Tiempos de expiración
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
const userInfoCache = fastify.authTools.createUserInfo(user)

// Almacenar en Redis
const cacheKey = `user:${user.id}:info`
await fastify.cache.set(cacheKey, userInfoCache, 1800) // 30 minutos

fastify.logger.info(`Login exitoso con Google OAuth: ${user.id}`, {
  userId: user.id,
  email: user.email,
  ip: request.ip
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

// Redirigir a dashboard con token de acceso (el refresh token ya está en cookies)
const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
const redirectUrl = new URL(`https://${frontendHost}/dashboard`);
redirectUrl.searchParams.append('access_token', accessToken);
redirectUrl.searchParams.append('expires_in', accessExpiresIn.toString());

return reply.redirect(redirectUrl.toString());
} catch (err) {
fastify.logger.error(`Error en callback OAuth de Google: ${err.message}`, {
  error: err.message,
  stack: err.stack,
  ip: request.ip
})

reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error en callback OAuth' 
})
}
})

// GET /auth/oauth/google/init - Iniciar flujo OAuth con Google
fastify.get('/oauth/google/init', async (request, reply) => {
try {
const config = fastify.config.oauth.google

if (!config.clientId || !config.clientSecret) {
  fastify.logger.error('Credenciales de Google OAuth no configuradas')
  
  reply.code(500).send({ 
    error: 'Error de configuración', 
    message: 'Credenciales de Google OAuth no configuradas' 
  })
  return
}

// Extraer información del dispositivo si se proporcionó
const deviceInfo = request.query.device_info 
  ? JSON.parse(Buffer.from(request.query.device_info, 'base64').toString())
  : null;

// Generar estado para prevenir CSRF y almacenar info del dispositivo
const state = fastify.authTools.generateRandomToken(16)

// Almacenar estado con información del dispositivo
await fastify.cache.set(`oauth:state:${state}`, {
  provider: 'google',
  deviceId: deviceInfo?.id || fastify.authTools.generateUUID(),
  deviceName: deviceInfo?.name || request.headers['user-agent'],
  deviceType: deviceInfo?.type || 'browser'
}, 600) // 10 minutos

// Construir URL de autorización
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.append('client_id', config.clientId)
authUrl.searchParams.append('redirect_uri', config.redirectUri)
authUrl.searchParams.append('response_type', 'code')
authUrl.searchParams.append('scope', 'email profile')
authUrl.searchParams.append('state', state)

fastify.logger.info(`Iniciando flujo OAuth con Google para IP=${request.ip}`, {
  ip: request.ip,
  state,
  deviceInfo: deviceInfo ? true : false
})

reply.send({ url: authUrl.toString() })
} catch (err) {
fastify.logger.error(`Error al iniciar flujo OAuth con Google: ${err.message}`, {
  error: err.message,
  stack: err.stack,
  ip: request.ip
})

reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al iniciar flujo OAuth' 
})
}
})

// GET /auth/oauth/42/init - Iniciar flujo OAuth con 42
fastify.get('/oauth/42/init', async (request, reply) => {
try {
const config = fastify.config.oauth.fortytwo

if (!config.clientId || !config.clientSecret) {
  fastify.logger.error('Credenciales de 42 OAuth no configuradas')
  
  reply.code(500).send({ 
    error: 'Error de configuración', 
    message: 'Credenciales de 42 OAuth no configuradas' 
  })
  return
}

// Extraer información del dispositivo si se proporcionó
const deviceInfo = request.query.device_info 
  ? JSON.parse(Buffer.from(request.query.device_info, 'base64').toString())
  : null;

// Generar estado para prevenir CSRF
const state = fastify.authTools.generateRandomToken(16)

// Almacenar estado con información del dispositivo
await fastify.cache.set(`oauth:state:${state}`, {
  provider: '42',
  deviceId: deviceInfo?.id || fastify.authTools.generateUUID(),
  deviceName: deviceInfo?.name || request.headers['user-agent'],
  deviceType: deviceInfo?.type || 'browser'
}, 600) // 10 minutos

// Construir URL de autorización
const authUrl = new URL('https://api.intra.42.fr/oauth/authorize')
authUrl.searchParams.append('client_id', config.clientId)
authUrl.searchParams.append('redirect_uri', config.redirectUri)
authUrl.searchParams.append('response_type', 'code')
authUrl.searchParams.append('scope', 'public')
authUrl.searchParams.append('state', state)

fastify.logger.info(`Iniciando flujo OAuth con 42 para IP=${request.ip}`, {
  ip: request.ip,
  state,
  deviceInfo: deviceInfo ? true : false
})

reply.send({ url: authUrl.toString() })
} catch (err) {
fastify.logger.error(`Error al iniciar flujo OAuth con 42: ${err.message}`, {
  error: err.message,
  stack: err.stack,
  ip: request.ip
})

reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error al iniciar flujo OAuth' 
})
}
})

// GET /auth/oauth/42/callback - Callback de 42 OAuth
fastify.get('/oauth/42/callback', {
schema: oauthCallbackSchema
}, async (request, reply) => {
try {
const { code, state, error } = request.query

// Verificar si hay error
if (error) {
  fastify.logger.warn(`Error en callback OAuth de 42: ${error}`, {
    error,
    state,
    ip: request.ip
  })
  
  reply.code(400).send({ 
    error: 'Error de autorización', 
    message: error 
  })
  return
}

// Verificar estado para prevenir CSRF
const stateData = await fastify.cache.get(`oauth:state:${state}`)
if (!stateData) {
  fastify.logger.warn(`Estado inválido en callback OAuth de 42: ${state}`, {
    state,
    ip: request.ip
  })
  
  reply.code(400).send({ 
    error: 'Estado inválido', 
    message: 'Posible ataque CSRF' 
  })
  return
}

// Extraer información del dispositivo del estado
let deviceId, deviceName = request.headers['user-agent'], deviceType = 'browser'

if (typeof stateData === 'object') {
  deviceId = stateData.deviceId
  deviceName = stateData.deviceName || deviceName
  deviceType = stateData.deviceType || deviceType
} else {
  // Estado simple - sólo proveedor
  deviceId = fastify.authTools.generateUUID()
}

// Eliminar estado usado
await fastify.cache.del(`oauth:state:${state}`)

const config = fastify.config.oauth.fortytwo

// Intercambiar código por token usando circuit breaker
let tokenResponse;
try {
  const response = await fastify.security.breakers.fortytwoOAuth.fire({
    method: 'post',
    url: 'https://api.intra.42.fr/oauth/token',
    data: {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri
    },
    timeout: 5000
  });
  
  tokenResponse = response.data;
  
} catch (err) {
  fastify.logger.error(`Error en OAuth 42 al obtener token: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    ip: request.ip
  });
  
  if (fastify.security.breakers.fortytwoOAuth.status === 'open') {
    reply.code(503).send({
      error: 'Servicio no disponible',
      message: 'El servicio de autenticación de 42 no está disponible temporalmente'
    });
  } else {
    reply.code(500).send({
      error: 'Error interno',
      message: 'Error en callback OAuth de 42'
    });
  }
  return;
}

// Obtener información del usuario usando circuit breaker
let userInfoResponse;
try {
  userInfoResponse = await fastify.security.breakers.fortytwoOAuth.fire({
    method: 'get',
    url: 'https://api.intra.42.fr/v2/me',
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}`
    },
    timeout: 5000
  });
} catch (err) {
  fastify.logger.error(`Error en OAuth 42 al obtener información del usuario: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    ip: request.ip
  });
  
  reply.code(500).send({
    error: 'Error interno',
    message: 'Error al obtener información del usuario de 42'
  });
  return;
}

const userInfo = userInfoResponse.data

fastify.logger.info(`Información de usuario obtenida de 42 OAuth: ${userInfo.email}`, {
  email: userInfo.email,
  fortytwoId: userInfo.id,
  ip: request.ip
})

// Verificar si el usuario ya existe
let user = await fastify.authDB.getUserByOAuthId(userInfo.id.toString(), '42')

if (!user) {
  // Si no existe, verificar si existe un usuario con el mismo email
  const existingUser = await fastify.authDB.getUserByEmail(userInfo.email)
  
  if (existingUser) {
    // Vincular cuenta existente con 42
    user = await fastify.authDB.updateUser(existingUser.id, {
      oauth_id: userInfo.id.toString(),
      account_type: existingUser.account_type === 'local' ? 'local' : '42'
    })
    
    fastify.logger.info(`Cuenta existente vinculada con 42: ${existingUser.id}`, {
      userId: existingUser.id,
      email: userInfo.email,
      fortytwoId: userInfo.id
    })
  } else {
    // Sanitizar username
    const sanitizedUsername = userInfo.login 
      ? fastify.security.sanitizeInput(userInfo.login) 
      : userInfo.email.split('@')[0]
    
    // Crear nuevo usuario
    user = await fastify.authDB.createUser({
      email: userInfo.email,
      username: sanitizedUsername,
      account_type: '42',
      oauth_id: userInfo.id.toString()
    })
    
    fastify.logger.info(`Nuevo usuario creado desde 42 OAuth: ${user.id}`, {
      userId: user.id,
      email: userInfo.email,
      fortytwoId: userInfo.id
    })
  }
}

// Si el usuario tiene 2FA, generar un token temporal y pedir verificación
if (user.has_2fa) {
  // Generar token temporal (válido por 5 minutos)
  const tempToken = fastify.jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      temp: true,
      device_id: deviceId,
      device_name: deviceName,
      device_type: deviceType,
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
    }
  )
  
  fastify.logger.info(`2FA requerido para login con 42 OAuth: ${user.id}`, {
    userId: user.id,
    email: user.email
  })
  
  // Redireccionar a la página de 2FA
  const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
  const redirectUrl = new URL(`https://${frontendHost}/2fa`);
  redirectUrl.searchParams.append('token', tempToken);
  redirectUrl.searchParams.append('provider', '42');
  
  return reply.redirect(redirectUrl.toString());
}

// Actualizar último login
await fastify.authDB.updateLastLogin(user.id)

// Generar tokens
const accessToken = fastify.authTools.generateJWT(user)
const refreshToken = fastify.authTools.generateRefreshToken()

// Tiempos de expiración
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
const userInfoCache = fastify.authTools.createUserInfo(user)

// Almacenar en Redis
const cacheKey = `user:${user.id}:info`
await fastify.cache.set(cacheKey, userInfoCache, 1800) // 30 minutos

fastify.logger.info(`Login exitoso con 42 OAuth: ${user.id}`, {
  userId: user.id,
  email: user.email,
  ip: request.ip
})

// Establecer cookie HttpOnly para el refresh token
reply
  .setCookie('refresh_token', refreshToken, {
    path: '/api/auth',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: refreshExpiresIn
  })
  // Establecer la cookie de sesión activa
  .setCookie('session_active', 'true', {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: refreshExpiresIn
  });

// Redirigir a dashboard con token de acceso (el refresh token ya está en cookies)
const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
const redirectUrl = new URL(`https://${frontendHost}/dashboard`);
redirectUrl.searchParams.append('access_token', accessToken);
redirectUrl.searchParams.append('expires_in', accessExpiresIn.toString());

return reply.redirect(redirectUrl.toString());
} catch (err) {
fastify.logger.error(`Error en callback OAuth de 42: ${err.message}`, {
  error: err.message,
  stack: err.stack,
  ip: request.ip
})

reply.code(500).send({ 
  error: 'Error interno', 
  message: 'Error en callback OAuth' 
})
}
})
}

module.exports = authRoutes