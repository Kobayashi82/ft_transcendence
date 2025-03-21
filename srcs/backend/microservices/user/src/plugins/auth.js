'use strict'

const fp = require('fastify-plugin')

async function authPlugin(fastify, options) {
  // Obtener la configuración
  const config = fastify.config
  
  // Verificar que existe la configuración necesaria
  if (!config) {
    throw new Error('No se ha encontrado la configuración')
  }
  
  // Decorar la instancia de fastify con funcionalidades de autenticación
  fastify.decorate('auth', {
    // Verificar si el usuario está autenticado a través de headers enviados por el gateway
    async authenticate(request, reply) {
      // Obtener headers de autenticación enviados por el gateway
      const userId = request.headers['x-user-id']
      const userRoles = request.headers['x-user-roles']
      
      if (!userId) {
        reply.code(401).send({ error: 'Se requiere autenticación' })
        return false
      }
      
      // Parsear roles (si vienen como string separado por comas)
      const roles = userRoles ? userRoles.split(',').map(role => role.trim()) : ['user']
      
      // Crear objeto de usuario a partir de los headers
      const user = {
        id: parseInt(userId, 10),
        roles: roles
      }
      
      // Intentar obtener información adicional del usuario desde la caché o base de datos
      try {
        // Buscar en caché primero
        const cacheKey = `user:${userId}`
        let userDetails = await fastify.cache.get(cacheKey)
        
        // Si no está en caché, obtener de la base de datos
        if (!userDetails) {
          userDetails = await fastify.users.getById(userId)
          
          // Guardar en caché para futuras solicitudes (5 minutos)
          if (userDetails) {
            await fastify.cache.set(cacheKey, userDetails, 300)
          }
        }
        
        // Combinar información de headers con los detalles obtenidos
        if (userDetails) {
          user.username = userDetails.username
          user.email = userDetails.email
          // Mantener los roles enviados por el gateway (tienen prioridad)
        }
      } catch (err) {
        fastify.logger.error(`Error al obtener información adicional del usuario: ${err.message}`)
        // Continuamos con la información básica del usuario
      }
      
      // Agregar usuario a la solicitud
      request.user = user
      return true
    },
    
    // Verificar si el usuario tiene el rol adecuado
    async authorize(roles = []) {
      return async (request, reply) => {
        // Primero autenticar
        const authenticated = await fastify.auth.authenticate(request, reply)
        if (!authenticated) return false
        
        // Si no se requieren roles específicos, solo autenticación
        if (!roles.length) return true
        
        // Verificar si el usuario tiene al menos uno de los roles requeridos
        const hasRole = roles.some(role => request.user.roles.includes(role))
        
        if (!hasRole) {
          reply.code(403).send({ error: 'No tienes permiso para acceder a este recurso' })
          return false
        }
        
        return true
      }
    },
    
    // Verificar si el usuario es el propietario del recurso o un administrador
    async authorizeOwnerOrAdmin(getUserId) {
      return async (request, reply) => {
        // Primero autenticar
        const authenticated = await fastify.auth.authenticate(request, reply)
        if (!authenticated) return false
        
        // getUserId es una función que extrae el ID del propietario basado en la solicitud
        const resourceOwnerId = await getUserId(request)
        
        // Verificar si el usuario es el propietario o un administrador
        const isOwner = request.user.id === resourceOwnerId
        const isAdmin = request.user.roles.includes('admin')
        
        if (!isOwner && !isAdmin) {
          reply.code(403).send({ error: 'No tienes permiso para acceder a este recurso' })
          return false
        }
        
        return true
      }
    }
  })
  
  // Middleware para rutas que requieren autenticación
  fastify.decorate('requireAuth', async function(request, reply) {
    return await fastify.auth.authenticate(request, reply)
  })
  
  // Middleware para rutas que requieren roles específicos
  fastify.decorate('requireRoles', function(roles = []) {
    return async function(request, reply) {
      return await fastify.auth.authorize(roles)(request, reply)
    }
  })
  
  // Middleware para rutas que requieren ser el propietario o admin
  fastify.decorate('requireOwnerOrAdmin', function(getUserId) {
    return async function(request, reply) {
      return await fastify.auth.authorizeOwnerOrAdmin(getUserId)(request, reply)
    }
  })
}

module.exports = fp(authPlugin, {
  name: 'auth',
  dependencies: ['redis']
})
