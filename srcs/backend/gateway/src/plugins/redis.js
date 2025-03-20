'use strict'

const fp = require('fastify-plugin')

/**
 * Plugin para integrar Redis para caché, rate limiting y más
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones del plugin
 */
async function redisPlugin(fastify, options) {
  const config = fastify.config

  try {
    // Registrar el plugin Redis
    await fastify.register(require('@fastify/redis'), {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      tls: config.redis.tls,
      family: 4, // IPv4
      connectTimeout: 5000, // 5 segundos
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      // Añadir listeners para eventos de Redis
      ...config.redis,
    })

    // Log para confirmar la conexión
    fastify.log.info(`Redis conectado en ${config.redis.host}:${config.redis.port}`)
    
    // Verificar la conexión
    const ping = await fastify.redis.ping()
    if (ping !== 'PONG') {
      throw new Error('No se recibió PONG de Redis')
    }

    // Agregar utilidades para caché
    fastify.decorate('cache', {
      /**
       * Obtener un valor de caché
       * @param {string} key - Clave a obtener
       * @returns {Promise<any>} - Valor almacenado o null
       */
      async get(key) {
        const value = await fastify.redis.get(key)
        return value ? JSON.parse(value) : null
      },

      /**
       * Guardar un valor en caché
       * @param {string} key - Clave para almacenar
       * @param {any} value - Valor a almacenar
       * @param {number} ttl - Tiempo de vida en segundos
       * @returns {Promise<boolean>} - Éxito de la operación
       */
      async set(key, value, ttl = 3600) {
        const stringValue = JSON.stringify(value)
        
        if (ttl) {
          return await fastify.redis.set(key, stringValue, 'EX', ttl)
        } else {
          return await fastify.redis.set(key, stringValue)
        }
      },

      /**
       * Eliminar una clave de la caché
       * @param {string} key - Clave a eliminar
       * @returns {Promise<number>} - Número de claves eliminadas
       */
      async del(key) {
        return await fastify.redis.del(key)
      },

      /**
       * Verificar si una clave existe
       * @param {string} key - Clave a verificar
       * @returns {Promise<number>} - 1 si existe, 0 si no
       */
      async exists(key) {
        return await fastify.redis.exists(key)
      }
    })

  } catch (err) {
    fastify.log.error(err, 'Error al conectar con Redis')
    
    // En desarrollo, continuar sin Redis
    if (config.isDev) {
      fastify.log.warn('Continuando sin Redis en modo desarrollo')
      
      // Crear un cliente falso para desarrollo
      fastify.decorate('redis', {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        exists: async () => 0,
        ping: async () => 'PONG'
      })
      
      // Caché falsa
      fastify.decorate('cache', {
        get: async () => null,
        set: async () => true,
        del: async () => 0,
        exists: async () => 0
      })
    } else {
      // En producción, fallar si no hay Redis
      throw err
    }
  }
}

module.exports = fp(redisPlugin, {
  name: 'redis',
  dependencies: ['logger']
})