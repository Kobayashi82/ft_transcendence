'use strict'

const {
  loginSchema,
  registerSchema,
  resetPasswordSchema
} = require('../schemas/auth')

// Rutas para la API de autenticación
async function authRoutes(fastify, options) {
  // POST /auth/register - Registro de un nuevo usuario
  fastify.post('/register', {
    schema: registerSchema
  }, async (request, reply) => {
    try {
      // Comprobar si el email ya existe
      const existingUser = await fastify.users.getByEmail(request.body.email)
      if (existingUser) {
        reply.code(409).send({ error: 'El email ya está en uso' })
        return
      }
      
      // Crear el usuario en el servicio de usuarios
      const userData = {
        username: request.body.username,
        email: request.body.email
      }
      
      const user = await fastify.users.create(userData)
      
      // También enviar datos al servicio de autenticación para que 
      // almacene la contraseña (Hash) y genere el token
      // Esto debería ser manejado en el microservicio de autenticación real
      
      reply.code(201).send(user)
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: `Error al registrar usuario: ${err.message}` })
    }
  })

  // POST /auth/login - Inicio de sesión
  fastify.post('/login', {
    schema: loginSchema
  }, async (request, reply) => {
    try {
      // En un sistema real, aquí se contactaría con el microservicio de autenticación
      // para validar las credenciales y obtener un token JWT
      
      // Ejemplo de respuesta simulada
      reply.send({
        token: 'este-seria-un-token-jwt-real',
        user: {
          id: 1,
          username: 'usuario_ejemplo',
          email: request.body.email,
          roles: ['user']
        }
      })
    } catch (err) {
      console.error(err)
      reply.code(401).send({ error: 'Credenciales inválidas' })
    }
  })

  // POST /auth/reset-password - Recuperar contraseña
  fastify.post('/reset-password', {
    schema: resetPasswordSchema
  }, async (request, reply) => {
    try {
      // Verificar si el email existe
      const user = await fastify.users.getByEmail(request.body.email)
      if (!user) {
        reply.code(404).send({ error: 'Email no encontrado' })
        return
      }
      
      // En un sistema real, aquí se enviaría un email con un enlace 
      // para restablecer la contraseña
      
      reply.send({
        success: true,
        message: 'Se ha enviado un enlace para restablecer la contraseña a tu email'
      })
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: `Error al solicitar restablecimiento de contraseña: ${err.message}` })
    }
  })

  // GET /auth/me - Obtener información del usuario autenticado
  fastify.get('/me', {
    preHandler: fastify.requireAuth
  }, async (request, reply) => {
    try {
      // La información del usuario ya está en request.user gracias al middleware requireAuth
      reply.send(request.user)
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: 'Error al obtener información del usuario' })
    }
  })

  // POST /auth/logout - Cerrar sesión
  fastify.post('/logout', {
    preHandler: fastify.requireAuth
  }, async (request, reply) => {
    try {
      // En un sistema real, aquí se invalidaría el token en el microservicio de autenticación
      // y se eliminaría de la caché de Redis
      
      reply.send({ success: true })
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: 'Error al cerrar sesión' })
    }
  })
}

module.exports = authRoutes