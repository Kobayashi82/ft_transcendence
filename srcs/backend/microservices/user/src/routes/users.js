'use strict'

const { 
  createUserSchema, 
  getUserSchema, 
  getAllUsersSchema, 
  updateUserSchema, 
  deleteUserSchema 
} = require('../schemas/users')

// Rutas para la API de usuarios
async function userRoutes(fastify, options) {
  // Ruta interna para verificar si un email existe (usado por el servicio de auth)
  fastify.get('/internal/check-email', async (request, reply) => {
    try {
      const email = request.query.email
      if (!email) {
        reply.code(400).send({ error: 'El parámetro email es requerido' })
        return
      }
      
      const user = await fastify.users.getByEmail(email)
      return { exists: !!user }
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ error: 'Error al verificar email' })
    }
  })

  // GET /users - Obtener todos los usuarios (solo admin)
  fastify.get('/', {
    schema: getAllUsersSchema,
    preHandler: fastify.requireRoles(['admin'])
  }, async (request, reply) => {
    try {
      // Intentar obtener de caché primero
      const cacheKey = 'users:all'
      const cached = await fastify.cache.get(cacheKey)
      
      if (cached) {
        fastify.log.debug('Usuarios encontrados en caché')
        return cached
      }
      
      // Si no está en caché, obtener de la base de datos
      const users = await fastify.users.getAll()
      
      // Guardar en caché por 5 minutos (300 segundos)
      await fastify.cache.set(cacheKey, users, 300)
      
      return users
    } catch (err) {
      fastify.log.error(err)
      reply.code(500).send({ error: 'Error al obtener usuarios' })
    }
  })

  // GET /users/:id - Obtener un usuario por ID (admin o el propio usuario)
  fastify.get('/:id', {
    schema: getUserSchema,
    preHandler: async (request, reply) => {
      // Permitir acceso si el usuario es admin o está accediendo a su propio perfil
      await fastify.requireAuth(request, reply)
      
      const userId = parseInt(request.params.id)
      const isOwnProfile = request.user.id === userId
      const isAdmin = request.user.roles.includes('admin')
      
      if (!isAdmin && !isOwnProfile) {
        reply.code(403).send({ error: 'No tienes permiso para acceder a este recurso' })
        return false
      }
      
      return true
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id)
      
      // Intentar obtener de caché primero
      const cacheKey = `users:${id}`
      const cached = await fastify.cache.get(cacheKey)
      
      if (cached) {
        fastify.log.debug('Usuario encontrado en caché')
        return cached
      }
      
      // Si no está en caché, obtener de la base de datos
      const user = await fastify.users.getById(id)
      
      if (!user) {
        reply.code(404).send({ error: 'Usuario no encontrado' })
        return
      }
      
      // Guardar en caché por 5 minutos (300 segundos)
      await fastify.cache.set(cacheKey, user, 300)
      
      return user
    } catch (err) {
      fastify.log.error(err)
      reply.code(500).send({ error: 'Error al obtener el usuario' })
    }
  })

  // POST /users - Crear un nuevo usuario
  fastify.post('/', {
    schema: createUserSchema
  }, async (request, reply) => {
    try {
      // Comprobar si el email ya existe
      const existingUser = await fastify.users.getByEmail(request.body.email)
      if (existingUser) {
        reply.code(409).send({ error: 'El email ya está en uso' })
        return
      }
      
      // Crear solo el usuario básico (sin lógica de autenticación)
      const userData = {
        username: request.body.username,
        email: request.body.email
        // Nota: Las contraseñas y la autenticación se manejarán en el servicio auth
      }
      
      const user = await fastify.users.create(userData)
      
      // Invalidar caché de todos los usuarios
      await fastify.cache.del('users:all')
      
      reply.code(201).send(user)
    } catch (err) {
      fastify.log.error(err)
      reply.code(500).send({ error: `Error al crear usuario: ${err.message}` })
    }
  })

  // PUT /users/:id - Actualizar un usuario (admin o el propio usuario)
  fastify.put('/:id', {
    schema: updateUserSchema,
    preHandler: async (request, reply) => {
      // Permitir acceso si el usuario es admin o está accediendo a su propio perfil
      await fastify.requireAuth(request, reply)
      
      const userId = parseInt(request.params.id)
      const isOwnProfile = request.user.id === userId
      const isAdmin = request.user.roles.includes('admin')
      
      // Solo un admin puede modificar roles
      if (request.body.roles && !isAdmin) {
        reply.code(403).send({ error: 'No tienes permiso para modificar roles' })
        return false
      }
      
      if (!isAdmin && !isOwnProfile) {
        reply.code(403).send({ error: 'No tienes permiso para modificar este usuario' })
        return false
      }
      
      return true
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id)
      
      // Verificar si el usuario existe
      const existingUser = await fastify.users.getById(id)
      if (!existingUser) {
        reply.code(404).send({ error: 'Usuario no encontrado' })
        return
      }
      
      // Si se cambia el email, verificar que no esté en uso
      if (request.body.email && request.body.email !== existingUser.email) {
        const emailExists = await fastify.users.getByEmail(request.body.email)
        if (emailExists) {
          reply.code(409).send({ error: 'El email ya está en uso' })
          return
        }
      }
      
      const updatedUser = await fastify.users.update(id, request.body)
      
      // Invalidar caché
      await fastify.cache.del(`users:${id}`)
      await fastify.cache.del('users:all')
      
      return updatedUser
    } catch (err) {
      fastify.log.error(err)
      reply.code(500).send({ error: `Error al actualizar usuario: ${err.message}` })
    }
  })

  // DELETE /users/:id - Eliminar un usuario (solo admin)
  fastify.delete('/:id', {
    schema: deleteUserSchema,
    preHandler: fastify.requireRoles(['admin'])
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id)
      
      // Verificar si el usuario existe
      const existingUser = await fastify.users.getById(id)
      if (!existingUser) {
        reply.code(404).send({ error: 'Usuario no encontrado' })
        return
      }
      
      // No permitir eliminar el propio usuario
      if (request.user.id === id) {
        reply.code(400).send({ error: 'No puedes eliminar tu propio usuario' })
        return
      }
      
      const result = await fastify.users.delete(id)
      
      // Invalidar caché
      await fastify.cache.del(`users:${id}`)
      await fastify.cache.del('users:all')
      
      return { success: true, id, changes: result.changes }
    } catch (err) {
      fastify.log.error(err)
      reply.code(500).send({ error: `Error al eliminar usuario: ${err.message}` })
    }
  })
}

module.exports = userRoutes
