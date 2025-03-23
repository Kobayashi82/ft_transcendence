'use strict'

const axios = require('axios')
const { oauthCallbackSchema } = require('../schemas/auth')

// Rutas para OAuth
async function oauthRoutes(fastify, options) {
  // GET /auth/oauth/google/init - Iniciar flujo OAuth con Google
  fastify.get('/oauth/google/init', async (request, reply) => {
    try {
      const config = fastify.config.oauth.google
      
      if (!config.clientId || !config.clientSecret) {
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
      
      reply.send({ url: authUrl.toString() })
    } catch (err) {
      fastify.logger.error(err)
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
        reply.code(400).send({ 
          error: 'Error de autorización', 
          message: error 
        })
        return
      }
      
      // Verificar estado para prevenir CSRF
      const storedProvider = await fastify.cache.get(`oauth:state:${state}`)
      if (!storedProvider || storedProvider !== 'google') {
        reply.code(400).send({ 
          error: 'Estado inválido', 
          message: 'Posible ataque CSRF' 
        })
        return
      }
      
      // Eliminar estado usado
      await fastify.cache.del(`oauth:state:${state}`)
      
      const config = fastify.config.oauth.google
      
      // Intercambiar código por token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      })
      
      // Obtener información del usuario
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      })
      
      const userInfo = userInfoResponse.data
      
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
        } else {
          // Crear nuevo usuario
          user = await fastify.authDB.createUser({
            email: userInfo.email,
            username: userInfo.name || userInfo.email.split('@')[0],
            account_type: 'google',
            oauth_id: userInfo.id
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
      
      // Determinamos la URL base para la redirección de forma más robusta
      let frontendHost;
      // Intentamos obtener el host del referer si está disponible
      if (request.headers['referer']) {
        try {
          const refererUrl = new URL(request.headers['referer']);
          frontendHost = refererUrl.hostname;
        } catch (e) {
          // Si hay un error al parsear el referer, usamos el host de la solicitud
          frontendHost = request.headers.host ? request.headers.host.split(':')[0] : 'localhost';
        }
      } else {
        // Si no hay referer, usamos el host de la solicitud
        frontendHost = request.headers.host ? request.headers.host.split(':')[0] : 'localhost';
      }

      // Aseguramos que no estamos redirigiendo a dominios externos
      if (frontendHost === 'accounts.google.com' || frontendHost === 'www.googleapis.com' || !frontendHost) {
        frontendHost = 'localhost'; // valor por defecto seguro
      }

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
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error en callback OAuth' 
      })
    }
  })

  // GET /auth/oauth/42/init - Iniciar flujo OAuth con 42
  fastify.get('/oauth/42/init', async (request, reply) => {
    try {
      const config = fastify.config.oauth.fortytwo
      
      if (!config.clientId || !config.clientSecret) {
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
      
      reply.send({ url: authUrl.toString() })
    } catch (err) {
      fastify.logger.error(err)
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
        reply.code(400).send({ 
          error: 'Error de autorización', 
          message: error 
        })
        return
      }
      
      // Verificar estado para prevenir CSRF
      const storedProvider = await fastify.cache.get(`oauth:state:${state}`)
      if (!storedProvider || storedProvider !== '42') {
        reply.code(400).send({ 
          error: 'Estado inválido', 
          message: 'Posible ataque CSRF' 
        })
        return
      }
      
      // Eliminar estado usado
      await fastify.cache.del(`oauth:state:${state}`)
      
      const config = fastify.config.oauth.fortytwo
      
      // Intercambiar código por token
      const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri
      })
      
      // Obtener información del usuario
      const userInfoResponse = await axios.get('https://api.intra.42.fr/v2/me', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      })
      
      const userInfo = userInfoResponse.data
      
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
        } else {
          // Crear nuevo usuario
          user = await fastify.authDB.createUser({
            email: userInfo.email,
            username: userInfo.login || userInfo.email.split('@')[0],
            account_type: '42',
            oauth_id: userInfo.id.toString()
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

      // Determinamos la URL base para la redirección de forma más robusta
      let frontendHost;
      // Intentamos obtener el host del referer si está disponible
      if (request.headers['referer']) {
        try {
          const refererUrl = new URL(request.headers['referer']);
          frontendHost = refererUrl.hostname;
        } catch (e) {
          // Si hay un error al parsear el referer, usamos el host de la solicitud
          frontendHost = request.headers.host ? request.headers.host.split(':')[0] : 'localhost';
        }
      } else {
        // Si no hay referer, usamos el host de la solicitud
        frontendHost = request.headers.host ? request.headers.host.split(':')[0] : 'localhost';
      }

      // Aseguramos que no estamos redirigiendo a dominios de 42
      if (frontendHost === 'api.intra.42.fr' || frontendHost === 'intra.42.fr' || !frontendHost) {
        frontendHost = 'localhost'; // valor por defecto seguro
      }

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
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error en callback OAuth' 
      })
    }
  })
}

module.exports = oauthRoutes