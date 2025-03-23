'use strict'

const axios = require('axios')
const { oauthCallbackSchema } = require('../schemas/auth')

// Rutas para OAuth
async function oauthRoutes(fastify, options) {
  // GET /auth/oauth/google/init - Iniciar flujo OAuth con Google
  fastify.get('/oauth/google/init', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '5 minutes'
      }
    }
  }, async (request, reply) => {
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
      
      // Generar estado para prevenir CSRF
      const state = fastify.authTools.generateRandomToken(16)
      
      // Almacenar estado en Redis con TTL de 10 minutos
      await fastify.cache.set(`oauth:state:${state}`, 'google', 600)
      
      // Construir URL de autorización
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.append('client_id', config.clientId)
      authUrl.searchParams.append('redirect_uri', config.redirectUri)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('scope', 'email profile')
      authUrl.searchParams.append('state', state)
      
      fastify.logger.info(`Iniciando flujo OAuth con Google para IP=${request.ip}`, {
        ip: request.ip,
        state
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

  // GET /auth/oauth/google/callback - Callback de Google OAuth
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
      const storedProvider = await fastify.cache.get(`oauth:state:${state}`)
      if (!storedProvider || storedProvider !== 'google') {
        fastify.logger.warn(`Estado inválido en callback OAuth de Google: ${state}`, {
          state,
          storedProvider,
          ip: request.ip
        })
        
        reply.code(400).send({ 
          error: 'Estado inválido', 
          message: 'Posible ataque CSRF' 
        })
        return
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
            exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
          }
        )
        
        fastify.logger.info(`2FA requerido para login con Google OAuth: ${user.id}`, {
          userId: user.id,
          email: user.email
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
      const userInfoCache = fastify.authTools.createUserInfo(user)
      
      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfoCache, 1800) // 30 minutos
      
      fastify.logger.info(`Login exitoso con Google OAuth: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: request.ip
      })

      const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';

      // Construir URL de redirección con el hostname determinado
      const redirectUrl = new URL(`https://${frontendHost}/dashboard`);
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('expires_in', (parseInt(fastify.config.jwt.expiresIn) || 900).toString());

      // También podemos añadir datos básicos del usuario
      redirectUrl.searchParams.append('user_id', user.id);
      redirectUrl.searchParams.append('username', encodeURIComponent(user.username));
      redirectUrl.searchParams.append('email', encodeURIComponent(user.email));

      // Redirigir al frontend
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

  // GET /auth/oauth/42/init - Iniciar flujo OAuth con 42
  fastify.get('/oauth/42/init', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '5 minutes'
      }
    }
  }, async (request, reply) => {
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
      
      // Generar estado para prevenir CSRF
      const state = fastify.authTools.generateRandomToken(16)
      
      // Almacenar estado en Redis con TTL de 10 minutos
      await fastify.cache.set(`oauth:state:${state}`, '42', 600)
      
      // Construir URL de autorización
      const authUrl = new URL('https://api.intra.42.fr/oauth/authorize')
      authUrl.searchParams.append('client_id', config.clientId)
      authUrl.searchParams.append('redirect_uri', config.redirectUri)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('scope', 'public')
      authUrl.searchParams.append('state', state)
      
      fastify.logger.info(`Iniciando flujo OAuth con 42 para IP=${request.ip}`, {
        ip: request.ip,
        state
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
      const storedProvider = await fastify.cache.get(`oauth:state:${state}`)
      if (!storedProvider || storedProvider !== '42') {
        fastify.logger.warn(`Estado inválido en callback OAuth de 42: ${state}`, {
          state,
          storedProvider,
          ip: request.ip
        })
        
        reply.code(400).send({ 
          error: 'Estado inválido', 
          message: 'Posible ataque CSRF' 
        })
        return
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
            exp: Math.floor(Date.now() / 1000) + 300 // 5 minutos
          }
        )
        
        fastify.logger.info(`2FA requerido para login con 42 OAuth: ${user.id}`, {
          userId: user.id,
          email: user.email
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
      const userInfoCache = fastify.authTools.createUserInfo(user)
      
      // Almacenar en Redis
      const cacheKey = `user:${user.id}:info`
      await fastify.cache.set(cacheKey, userInfoCache, 1800) // 30 minutos
      
      fastify.logger.info(`Login exitoso con 42 OAuth: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: request.ip
      })

      // Determinamos la URL base para la redirección de forma más robusta
      const frontendHost = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';

      // Construir URL de redirección con el hostname determinado
      const redirectUrl = new URL(`https://${frontendHost}/dashboard`);
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('expires_in', (parseInt(fastify.config.jwt.expiresIn) || 900).toString());

      // También podemos añadir datos básicos del usuario
      redirectUrl.searchParams.append('user_id', user.id);
      redirectUrl.searchParams.append('username', encodeURIComponent(user.username));
      redirectUrl.searchParams.append('email', encodeURIComponent(user.email));

      // Redirigir al frontend
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

module.exports = oauthRoutes