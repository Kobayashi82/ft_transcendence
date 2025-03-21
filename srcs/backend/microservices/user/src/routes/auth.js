'use strict'

const {
  loginSchema,
  registerSchema,
  resetPasswordSchema
} = require('../schemas/auth')
const axios = require('axios')

// Rutas para la API de autenticación
async function authRoutes(fastify, options) {
  // Decorar con instancia de axios para comunicarse con otros servicios
  fastify.decorate('axios', axios.create({
    timeout: 5000
  }))

  // POST /auth/register - Registro de un nuevo usuario
  fastify.post('/register', {
    schema: registerSchema
  }, async (request, reply) => {
    try {
      // 1. Verificar si el email ya existe en el servicio de usuarios
      try {
        const userServiceUrl = fastify.config.services.user.url
        const response = await fastify.axios.get(`${userServiceUrl}/internal/check-email`, {
          params: { email: request.body.email }
        })
        
        if (response.data.exists) {
          reply.code(409).send({ error: 'El email ya está en uso' })
          return
        }
      } catch (err) {
        fastify.logger.error(`Error al verificar email: ${err.message}`)
        reply.code(500).send({ error: 'Error al verificar disponibilidad del email' })
        return
      }
      
      // 2. Crear el usuario en el servicio de usuarios
      let user
      try {
        const userServiceUrl = fastify.config.services.user.url
        const userData = {
          username: request.body.username,
          email: request.body.email
        }
        
        const response = await fastify.axios.post(`${userServiceUrl}/`, userData)
        user = response.data
      } catch (err) {
        fastify.logger.error(`Error al crear usuario: ${err.message}`)
        reply.code(500).send({ error: 'Error al crear el usuario' })
        return
      }
      
      // 3. Almacenar la contraseña (hash) en el servicio de autenticación
      const passwordHash = await fastify.bcrypt.hash(request.body.password, 10)
      
      // Guardar credenciales en la base de datos de autenticación
      await fastify.auth.storeCredentials({
        userId: user.id,
        email: user.email,
        passwordHash: passwordHash,
        roles: ['user']
      })
      
      // 4. Generar token JWT
      const token = fastify.jwt.sign({ 
        id: user.id,
        email: user.email,
        roles: ['user']
      }, { expiresIn: fastify.config.jwt.expiresIn })
      
      // 5. Responder al cliente
      reply.code(201).send({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: ['user']
        }
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ error: `Error al registrar usuario: ${err.message}` })
    }
  })

  // POST /auth/login - Inicio de sesión
  fastify.post('/login', {
    schema: loginSchema
  }, async (request, reply) => {
    try {
      // 1. Buscar credenciales por email
      const credentials = await fastify.auth.getCredentialsByEmail(request.body.email)
      
      if (!credentials) {
        reply.code(401).send({ error: 'Credenciales inválidas' })
        return
      }
      
      // 2. Verificar la contraseña
      const isValid = await fastify.bcrypt.compare(request.body.password, credentials.passwordHash)
      
      if (!isValid) {
        reply.code(401).send({ error: 'Credenciales inválidas' })
        return
      }
      
      // 3. Obtener información completa del usuario desde el servicio de usuarios
      let user
      try {
        const userServiceUrl = fastify.config.services.user.url
        const response = await fastify.axios.get(`${userServiceUrl}/${credentials.userId}`)
        user = response.data
      } catch (err) {
        fastify.logger.error(`Error al obtener información del usuario: ${err.message}`)
        // Usar información básica si no podemos obtener los detalles
        user = { 
          id: credentials.userId,
          email: credentials.email
        }
      }
      
      // 4. Generar token JWT
      const token = fastify.jwt.sign({ 
        id: credentials.userId,
        email: credentials.email,
        roles: credentials.roles || ['user']
      }, { expiresIn: fastify.config.jwt.expiresIn })
      
      // 5. Responder al cliente
      reply.send({
        token,
        user: {
          id: credentials.userId,
          username: user.username || 'usuario',
          email: credentials.email,
          roles: credentials.roles || ['user']
        }
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(401).send({ error: 'Credenciales inválidas' })
    }
  })

  // POST /auth/reset-password - Recuperar contraseña
  fastify.post('/reset-password', {
    schema: resetPasswordSchema
  }, async (request, reply) => {
    try {
      // 1. Verificar si el email existe
      const credentials = await fastify.auth.getCredentialsByEmail(request.body.email)
      
      if (!credentials) {
        // No revelar si el email existe o no por razones de seguridad
        reply.send({
          success: true,
          message: 'Si el email existe, se ha enviado un enlace para restablecer la contraseña'
        })
        return
      }
      
      // 2. Generar token de restablecimiento
      const resetToken = fastify.crypto.randomBytes(20).toString('hex')
      
      // 3. Guardar token en Redis con TTL (1 hora)
      await fastify.cache.set(`reset:${resetToken}`, credentials.userId, 3600)
      
      // 4. En un sistema real, aquí se enviaría un email con un enlace 
      // que contiene el token para restablecer la contraseña
      
      reply.send({
        success: true,
        message: 'Se ha enviado un enlace para restablecer la contraseña a tu email'
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ error: `Error al solicitar restablecimiento de contraseña: ${err.message}` })
    }
  })

  // GET /auth/me - Obtener información del usuario autenticado
  fastify.get('/me', {
    preHandler: fastify.requireAuth
  }, async (request, reply) => {
    try {
      // La información básica del usuario ya está en request.user gracias al middleware requireAuth
      const userId = request.user.id
      
      // Obtener información completa desde el servicio de usuarios
      let userDetails
      try {
        const userServiceUrl = fastify.config.services.user.url
        const response = await fastify.axios.get(`${userServiceUrl}/${userId}`)
        userDetails = response.data
      } catch (err) {
        fastify.logger.error(`Error al obtener detalles del usuario: ${err.message}`)
        // Continuamos con la información básica si hay error
      }
      
      // Combinar información
      const userData = {
        ...request.user,
        ...(userDetails || {})
      }
      
      reply.send(userData)
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ error: 'Error al obtener información del usuario' })
    }
  })

  // POST /auth/logout - Cerrar sesión
  fastify.post('/logout', {
    preHandler: fastify.requireAuth
  }, async (request, reply) => {
    try {
      // Obtener el token del header de autorización
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.send({ success: true })
        return
      }
      
      const token = authHeader.split(' ')[1]
      
      // Añadir el token a la lista negra en Redis
      // La clave expirará automáticamente según el TTL
      await fastify.cache.set(`blacklist:${token}`, '1', 
        fastify.config.jwt.expiresIn || 3600)
      
      reply.send({ success: true })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ error: 'Error al cerrar sesión' })
    }
  })
}

module.exports = authRoutes
