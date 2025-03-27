'use strict'

const fp = require('fastify-plugin')

async function redisWrapper(fastify, options) {
  let hasRedis = false
  
  // Evitar el registro directo de @fastify/redis para tener más control
  try {
    // Intentar conectar a Redis manualmente con ioredis
    const Redis = require('ioredis');
    let redisClient = null;
    
    try {
      // Crear una instancia de Redis con las opciones proporcionadas
      redisClient = new Redis(options);
      
      // Esperar a que la conexión esté lista (con timeout)
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 3000);
        
        redisClient.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        redisClient.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      await connectionPromise;
      
      // Si llegamos aquí, la conexión fue exitosa
      await redisClient.ping();
      hasRedis = true;
      fastify.log.info('Redis connection successful');
      
      // Decorar fastify con el cliente Redis
      fastify.decorate('redis', redisClient);
    } catch (redisError) {
      fastify.log.warn(`Redis connection failed: ${redisError.message}. Using memory fallbacks`);
      
      // Cerrar cliente si existe pero falló
      if (redisClient) {
        try {
          redisClient.disconnect();
        } catch (e) {
          // Ignorar errores al desconectar
        }
      }
      
      throw redisError;
    }
  } catch (err) {
    // Si el cliente Redis falló, usar implementación en memoria
    if (!fastify.hasDecorator('redis')) {
      fastify.decorate('redis', {
        get: async (key) => {
          if (!global._redisDummyStorage) global._redisDummyStorage = {};
          return global._redisDummyStorage[key] || null;
        },
        set: async (key, value) => {
          if (!global._redisDummyStorage) global._redisDummyStorage = {};
          global._redisDummyStorage[key] = value;
          return 'OK';
        },
        incr: async (key) => {
          if (!global._redisDummyStorage) global._redisDummyStorage = {};
          if (!global._redisDummyStorage[key]) global._redisDummyStorage[key] = 0;
          global._redisDummyStorage[key] = parseInt(global._redisDummyStorage[key]) + 1;
          return global._redisDummyStorage[key];
        },
        expire: async (key, seconds) => {
          if (!global._redisDummyStorage) global._redisDummyStorage = {};
          
          setTimeout(() => {
            if (global._redisDummyStorage && global._redisDummyStorage[key]) {
              delete global._redisDummyStorage[key];
            }
          }, seconds * 1000);
          
          return 1;
        },
        ttl: async (key) => {
          return 60;
        },
        del: async (...keys) => {
          if (!global._redisDummyStorage) return 0;
          
          let count = 0;
          for (const key of keys) {
            if (global._redisDummyStorage[key]) {
              delete global._redisDummyStorage[key];
              count++;
            }
          }
          return count;
        },
        ping: async () => {
          return 'PONG';
        }
      });
    }
  }
  
  // Decorar fastify con un indicador de disponibilidad de Redis real
  if (!fastify.hasDecorator('hasRedis')) {
    fastify.decorate('hasRedis', hasRedis);
  }
  
  fastify.log.info(`Redis wrapper initialized. Real Redis: ${hasRedis}`);
}

module.exports = fp(redisWrapper, { 
  name: 'redis-wrapper',
  dependencies: ['logger'],
  fastify: '5.x'
});