'use strict'

// Rutas administrativas para gestión de usuarios
async function userAdminRoutes(fastify, options) {
  // GET /auth/admin/users - Listar todos los usuarios (solo admin)
  fastify.get('/users', {
    preValidation: fastify.verifyAdmin
  }, async (request, reply) => {
    try {
      // Obtener parámetros de paginación
      const page = parseInt(request.query.page) || 1
      const limit = parseInt(request.query.limit) || 20
      const offset = (page - 1) * limit
      
      // Obtener usuarios
      const users = await fastify.db.all(
        'SELECT id, email, username, account_type, has_2fa, last_login, is_active, created_at FROM users LIMIT ? OFFSET ?',
        [limit, offset],
        'users'
      )
      
      // Obtener roles para cada usuario
      for (const user of users) {
        const roles = await fastify.db.all(
          'SELECT role FROM user_roles WHERE user_id = ?',
          [user.id],
          'user_roles'
        )
        user.roles = roles.map(r => r.role)
      }
      
      // Obtener total de usuarios para paginación
      const total = await fastify.db.get(
        'SELECT COUNT(*) as count FROM users',
        [],
        'users'
      )
      
      reply.send({
        data: users,
        pagination: {
          total: total.count,
          page,
          limit,
          pages: Math.ceil(total.count / limit)
        }
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al obtener usuarios' 
      })
    }
  })
  
  // GET /auth/admin/users/:id - Obtener un usuario específico (solo admin)
  fastify.get('/users/:id', {
    preValidation: fastify.verifyAdmin
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)
      
      // Obtener usuario
      const user = await fastify.authDB.getUserById(userId)
      
      if (!user) {
        reply.code(404).send({ 
          error: 'No encontrado', 
          message: 'Usuario no encontrado' 
        })
        return
      }
      
      // Obtener información adicional
      const sessions = await fastify.authDB.getActiveSessions(userId)
      
      // No incluir password_hash en la respuesta
      delete user.password_hash
      delete user.salt
      
      reply.send({
        ...user,
        sessions: sessions
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al obtener usuario' 
      })
    }
  })
  
  // PUT /auth/admin/users/:id - Actualizar un usuario (solo admin)
  fastify.put('/users/:id', {
    preValidation: fastify.verifyAdmin
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)
      
      // Obtener usuario actual
      const user = await fastify.authDB.getUserById(userId)
      
      if (!user) {
        reply.code(404).send({ 
          error: 'No encontrado', 
          message: 'Usuario no encontrado' 
        })
        return
      }
      
      // Actualizar usuario
      const updatedUser = await fastify.authDB.updateUser(userId, request.body)
      
      // Actualizar roles si se proporcionan
      if (request.body.roles && Array.isArray(request.body.roles)) {
        await fastify.authDB.updateUserRoles(userId, request.body.roles)
      }
      
      // Actualizar en Redis si existe
      const cacheKey = `user:${userId}:info`
      const cached = await fastify.cache.exists(cacheKey)
      
      if (cached) {
        const userInfo = fastify.authTools.createUserInfo(updatedUser)
        await fastify.cache.set(cacheKey, userInfo, 1800) // 30 minutos
      }
      
      reply.send({
        success: true,
        user: updatedUser
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al actualizar usuario' 
      })
    }
  })
  
  // DELETE /auth/admin/users/:id - Eliminar un usuario (solo admin)
  fastify.delete('/users/:id', {
    preValidation: fastify.verifyAdmin
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)
      
      // Evitar que el administrador se elimine a sí mismo
      if (userId === request.user.sub) {
        reply.code(400).send({ 
          error: 'Solicitud incorrecta', 
          message: 'No puedes eliminar tu propia cuenta' 
        })
        return
      }
      
      // Verificar que el usuario existe
      const user = await fastify.authDB.getUserById(userId)
      
      if (!user) {
        reply.code(404).send({ 
          error: 'No encontrado', 
          message: 'Usuario no encontrado' 
        })
        return
      }
      
      // Eliminar usuario
      await fastify.authDB.deleteUser(userId)
      
      // Eliminar de Redis si existe
      const cacheKey = `user:${userId}:info`
      await fastify.cache.del(cacheKey)
      
      reply.send({
        success: true,
        message: 'Usuario eliminado correctamente'
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al eliminar usuario' 
      })
    }
  })
  
  // POST /auth/admin/users/:id/reset-password - Resetear contraseña de un usuario (solo admin)
  fastify.post('/users/:id/reset-password', {
    preValidation: fastify.verifyAdmin
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)
      
      // Verificar que el usuario existe
      const user = await fastify.authDB.getUserById(userId)
      
      if (!user) {
        reply.code(404).send({ 
          error: 'No encontrado', 
          message: 'Usuario no encontrado' 
        })
        return
      }
      
      // Verificar que la cuenta es local
      if (user.account_type !== 'local') {
        reply.code(400).send({ 
          error: 'Solicitud incorrecta', 
          message: 'No se puede resetear la contraseña de una cuenta OAuth' 
        })
        return
      }
      
      // Generar nueva contraseña aleatoria
      const newPassword = fastify.authTools.generateRandomToken(10)
      
      // Hashear nueva contraseña
      const passwordHash = await fastify.authTools.hashPassword(newPassword)
      
      // Actualizar usuario
      await fastify.authDB.updateUser(userId, { password_hash: passwordHash })
      
      // Revocar todos los tokens y sesiones
      await fastify.authDB.revokeAllRefreshTokens(userId)
      await fastify.authDB.revokeAllSessions(userId)
      
      reply.send({
        success: true,
        message: 'Contraseña reseteada correctamente',
        new_password: newPassword // En un entorno real se enviaría por email o SMS
      })
    } catch (err) {
      fastify.logger.error(err)
      reply.code(500).send({ 
        error: 'Error interno', 
        message: 'Error al resetear contraseña' 
      })
    }
  })
}

module.exports = userAdminRoutes
