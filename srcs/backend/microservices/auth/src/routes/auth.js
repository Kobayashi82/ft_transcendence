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
  enable2FASchema
} = require('../schemas/auth')

// Rutas para la API de autenticación
async function authRoutes(fastify, options) {
  // POST /auth/register - Registrar un nuevo usuario
  fastify.post('/register', {
    schema: registerSchema,
  }, async (request, reply) => {
    try {
      const { email, username, password } = request.body
      
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
        
        // Almacenar token de refresco
        await fastify.authDB.createRefreshToken(
          user.id, 
          refreshToken, 
          parseInt(fastify.config.jwt.refreshExpiresIn) || 604800 // 7 días por defecto
        )
        
        // Crear información de usuario para Redis
        const userInfo = fastify.authTools.createUserInfo(user)
        
        // Almacenar en Redis
        const cacheKey = `user:${user.id}:info`
        await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos
        
        fastify.logger.info(`Registro exitoso para usuario: ${user.id}`, {
          userId: user.id,
          email: user.email,
          ip: request.ip
        })
        
        // Responder con tokens y datos de usuario
        reply.code(201).send({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: parseInt(fastify.config.jwt.expiresIn) || 900, // 15 minutos por defecto
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
      const { email, password } = request.body

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

      // Actualizar último login
      await fastify.authDB.updateLastLogin(user.id)

      // Generar tokens
      const accessToken = fastify.authTools.generateJWT(user)
      const refreshToken = fastify.authTools.generateRefreshToken()

      // Almacenar token de refresco
      await fastify.authDB.createRefreshToken(
        user.id, 
        refreshToken, 
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800 // 7 días por defecto
      )

      // Registrar sesión
      await fastify.authDB.createSession(
        user.id,
        fastify.authTools.generateUUID(),
        request.ip,
        request.headers['user-agent'],
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800
      )

      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)

      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos

      fastify.logger.info(`Login exitoso para usuario: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: request.ip
      })

      // Responder con tokens y datos de usuario
      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: parseInt(fastify.config.jwt.expiresIn) || 900, // 15 minutos por defecto
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
      const { code, token } = request.body
      
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
      
      // Actualizar último login
      await fastify.authDB.updateLastLogin(user.id)
      
      // Generar tokens
      const accessToken = fastify.authTools.generateJWT(user)
      const refreshToken = fastify.authTools.generateRefreshToken()
      
      // Almacenar token de refresco
      await fastify.authDB.createRefreshToken(
        user.id, 
        refreshToken, 
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800 // 7 días por defecto
      )

      // Registrar sesión
      await fastify.authDB.createSession(
        user.id,
        fastify.authTools.generateUUID(),
        request.ip,
        request.headers['user-agent'],
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800
      )

      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)

      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos

      // Responder con tokens y datos de usuario
      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: parseInt(fastify.config.jwt.expiresIn) || 900, // 15 minutos por defecto
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
      const { refresh_token } = request.body

      // Verificar token de refresco
      const tokenData = await fastify.authDB.getRefreshToken(refresh_token)
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

      // Revocar token actual
      await fastify.authDB.revokeRefreshToken(refresh_token)

      // Generar nuevos tokens
      const accessToken = fastify.authTools.generateJWT(user)
      const newRefreshToken = fastify.authTools.generateRefreshToken()

      // Almacenar nuevo token de refresco
      await fastify.authDB.createRefreshToken(
        user.id, 
        newRefreshToken, 
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800 // 7 días por defecto
      )

      // Crear información de usuario para Redis
      const userInfo = fastify.authTools.createUserInfo(user)

      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos

      // Responder con nuevos tokens
      reply.send({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: parseInt(fastify.config.jwt.expiresIn) || 900, // 15 minutos por defecto
        token_type: 'Bearer'
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
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.send({ success: true })
      return
    }

    const token = authHeader.split(' ')[1]

    // Añadir token a la lista negra en Redis
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

    // Revocar token de refresco si se proporciona
    if (request.body && request.body.refresh_token) {
      try {
        await fastify.authDB.revokeRefreshToken(request.body.refresh_token)
      } catch (err) {
        fastify.logger.error(`Error al revocar token de refresco: ${err.message}`)
      }
    }

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
    const { token, password } = request.body

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
      }
    }

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
    await fastify.authDB.revokeAllRefreshTokens(userId)

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
        expires_at: s.expires_at
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

// DELETE /auth/sessions - Revocar todas las sesiones excepto la actual
fastify.delete('/sessions', {
  preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
  try {
    const userId = request.user.sub

    await fastify.authDB.revokeAllSessions(userId)

    reply.send({
      success: true,
      message: 'Todas las sesiones han sido revocadas'
    })
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
    const token = request.headers.authorization.split(' ')[1]
    const decoded = fastify.jwt.decode(token)
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000)
      if (ttl > 0) {
        await fastify.cache.set(`blacklist:${token}`, '1', ttl)
      }
    }

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
}

module.exports = authRoutes