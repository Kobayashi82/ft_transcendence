'use strict'

const fp = require('fastify-plugin')

// Plugin for Redis
async function redisPlugin(fastify, options) {
  const config = fastify.config

  try {
    // Register Redis
    await fastify.register(require('@fastify/redis'), {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      tls: config.redis.tls,
      family: 4,
      connectTimeout: 5000,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      // Add listeners for events
      ...config.redis,
    })

	console.log(`Redis connected on port ${config.redis.port}`)
    
    // Check the connection
    const ping = await fastify.redis.ping()
    if (ping !== 'PONG') throw new Error('Did not receive PONG from Redis')

    // Add utils for cache
    fastify.decorate('cache', {
      /**
       * Get a cached value
       * @param {string} key			Key to retrieve
       * @returns {Promise<any>}		Stored value or null
       */
      async get(key) {
        const value = await fastify.redis.get(key)
        return value ? JSON.parse(value) : null
      },

      /**
       * Store a value in cache
       * @param {string} key			Key to store
       * @param {any} value				Value to store
       * @param {number} ttl		 	Time to live in seconds
       * @returns {Promise<boolean>}	Operation success
       */
      async set(key, value, ttl = 3600) {
        const stringValue = JSON.stringify(value)
        
        if (ttl)	return await fastify.redis.set(key, stringValue, 'EX', ttl)
        else		return await fastify.redis.set(key, stringValue)
      },

      /**
       * Delete a key from the cache
       * @param {string} key			Key to delete
       * @returns {Promise<number>}		Number of deleted keys
       */
      async del(key) { return await fastify.redis.del(key) },

      /**
       * Check if a key exists
       * @param {string} key			Key to check
       * @returns {Promise<number>}		1 if exists, 0 if not
       */
      async exists(key) { return await fastify.redis.exists(key) }
    })

  } catch (err) {
	console.error(`Error connecting to Redis: ${err}`)
	throw err
  }    
    // if (config.isDev) {
    //   fastify.log.warn('Continuando sin Redis en modo desarrollo')
      
    //   // Crear un cliente falso para desarrollo
    //   fastify.decorate('redis', {
    //     get: async () => null,
    //     set: async () => 'OK',
    //     del: async () => 0,
    //     exists: async () => 0,
    //     ping: async () => 'PONG'
    //   })
      
    //   // Caché falsa
    //   fastify.decorate('cache', {
    //     get: async () => null,
    //     set: async () => true,
    //     del: async () => 0,
    //     exists: async () => 0
    //   })
    // } else {
    //   // En producción, fallar si no hay Redis
    //   throw err
    // }
}

module.exports = fp(redisPlugin, { name: 'redis' })
