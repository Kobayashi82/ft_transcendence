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

  // Add this to your auth.js routes file if it's not there
// GET /auth/me - Obtain current user information
fastify.get('/me', {
  preValidation: [fastify.verifyJWT]
}, async (request, reply) => {
  try {
    const userId = request.user.sub;
    
    // Fetch user from database
    const user = await fastify.authDB.getUserById(userId);
    if (!user) {
      reply.code(404).send({ 
        error: 'Not found', 
        message: 'User not found' 
      });
      return;
    }
    
    // Get active sessions
    const sessions = await fastify.authDB.getActiveSessions(userId);
    
    // Get user devices
    const devices = await fastify.authDB.getUserDevices(userId);
    
    // Return user data
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
    });
  } catch (err) {
    fastify.logger.error(err);
    reply.code(500).send({ 
      error: 'Internal error', 
      message: 'Error fetching user information' 
    });
  }
});

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
  
  // Resto de las rutas...
}

module.exports = authRoutes