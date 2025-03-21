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
  // GET /users - Obtener todos los usuarios
  fastify.get('/', { schema: getAllUsersSchema }, async (request, reply) => {
    try {
      const users = await fastify.users.getAll()
      return users
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: 'Error al obtener usuarios' })
    }
  })

  // GET /users/:id - Obtener un usuario por ID
  fastify.get('/:id', { schema: getUserSchema }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id)
      const user = await fastify.users.getById(id)
  
      if (!user) {
        reply.code(404).send({ error: 'Usuario no encontrado' })

		fastify.log.error(`Error al obtener usuario con ID ${id}`, { 
		  userId: id, 
		  error: err.message,
		  stack: err.stack
		})

        return
      }
      
	  // Log informativo
	  fastify.log.info(`Obteniendo usuario con ID ${id}`, { 
		userId: id, 
		requestedBy: request.user?.id 
	  })

      return user
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: 'Error al obtener el usuario' })
    }
  })

  // POST /users - Crear un nuevo usuario
  fastify.post('/', { schema: createUserSchema }, async (request, reply) => {
    try {
      // Comprobar si el email ya existe
      const existingUser = await fastify.users.getByEmail(request.body.email)
      if (existingUser) {
        reply.code(409).send({ error: 'El email ya está en uso' })
        return
      }
      
      const user = await fastify.users.create(request.body)
      reply.code(201).send(user)
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: `Error al crear usuario: ${err.message}` })
    }
  })

  // PUT /users/:id - Actualizar un usuario
  fastify.put('/:id', { schema: updateUserSchema }, async (request, reply) => {
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
      return updatedUser
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: `Error al actualizar usuario: ${err.message}` })
    }
  })

  // DELETE /users/:id - Eliminar un usuario
  fastify.delete('/:id', { schema: deleteUserSchema }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id)
      
      // Verificar si el usuario existe
      const existingUser = await fastify.users.getById(id)
      if (!existingUser) {
        reply.code(404).send({ error: 'Usuario no encontrado' })
        return
      }
      
      const result = await fastify.users.delete(id)
      return { success: true, id, changes: result.changes }
    } catch (err) {
      console.error(err)
      reply.code(500).send({ error: `Error al eliminar usuario: ${err.message}` })
    }
  })
}

module.exports = userRoutes
