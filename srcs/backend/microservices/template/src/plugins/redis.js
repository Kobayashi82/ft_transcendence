'use strict'

const fp = require('fastify-plugin')

async function redisPlugin(fastify, options) {
  try {
    // Configuración simplificada para Redis
    fastify.register(require('@fastify/redis'), {
      host: options.redis.host,
      port: options.redis.port,
      closeClient: true
    })
    
    fastify.log.info(`Intento de conexión a Redis en ${options.redis.host}:${options.redis.port}`)
    
    // Agregar helper para facilitar el uso de Redis
    fastify.decorate('cacheSet', async (key, value, ttl = 3600) => {
      await fastify.redis.set(key, JSON.stringify(value), 'EX', ttl)
      return value
    })
    
    fastify.decorate('cacheGet', async (key) => {
      const data = await fastify.redis.get(key)
      if (data) {
        return JSON.parse(data)
      }
      return null
    })
  } catch (err) {
    fastify.log.error(`Error al configurar Redis: ${err.message}`)
    // En lugar de fallar, continuamos con funcionalidad limitada
    fastify.decorate('cacheSet', async (key, value) => value)
    fastify.decorate('cacheGet', async () => null)
  }
}

// Establecer un timeout más largo y hacer el plugin opcional
module.exports = fp(redisPlugin, {
  name: 'redis',
  dependencies: [], 
  timeout: 30000
})