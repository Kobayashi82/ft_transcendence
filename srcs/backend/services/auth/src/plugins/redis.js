'use strict'

const fp = require('fastify-plugin')

function redisPlugin(fastify, options, done) {
  const config = fastify.config
  
  const localCache = new Map()
  let redisClient = null;
  
  fastify.decorate('cache', {

    async get(key) {
      const item = localCache.get(key)
      if (!item) return null
      
      if (item.expiry && item.expiry < Date.now()) {
        localCache.delete(key)
        return null
      }
      
      return item.value
    },

    async set(key, value, ttl = 3600) {
      const expiry = ttl ? Date.now() + (ttl * 1000) : null
      localCache.set(key, { value, expiry })
      return 'OK'
    },

    async del(key) { return localCache.delete(key) ? 1 : 0 },
    
    async exists(key) {
      if (!localCache.has(key)) return 0
      
      const item = localCache.get(key)
      if (item.expiry && item.expiry < Date.now()) {
        localCache.delete(key)
        return 0
      }
      
      return 1
    },
    
    isRedisAvailable() { return redisClient !== null && redisClient.status === 'ready' }
  })

  fastify.decorate('redis', {
    ping: async () => { return 'LOCALCACHE' },
  })

  done()
  
  setTimeout(() => {
    try {
      const Redis = require('ioredis')
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        tls: null,
        family: 4,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
      })
      
      let connected = false;
      
      redisClient.on('connect', () => {
        if (connected) return;
        connected = true;
        
        fastify.logger.info(`Redis connected on port ${config.redis.port}`)
        
        const cache = fastify.cache
        
        cache.get = async (key) => {
          const value = await redisClient.get(key)
          return value ? JSON.parse(value) : null
        }
        
        cache.set = async (key, value, ttl = 3600) => {
          const stringValue = JSON.stringify(value)
          if (ttl)  return await redisClient.set(key, stringValue, 'EX', ttl)
          else      return await redisClient.set(key, stringValue)
        }
        
        cache.del = async (key) => { return await redisClient.del(key) }
        
        cache.exists = async (key) => { return await redisClient.exists(key) }
        
        fastify.redis = redisClient;
      })
      
      redisClient.on('error', (err) => {
        if (!connected) {
          fastify.logger.warn(`Redis connection error. Using local memory cache`)
          
          redisClient.disconnect();
        }
      })
      
    } catch (err) {
      fastify.logger.warn(`Redis setup error. Using local memory cache`)
    }
  }, 0)
}

module.exports = fp(redisPlugin, { name: 'redis' })
