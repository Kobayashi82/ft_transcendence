'use strict'

const fp = require('fastify-plugin')

async function diagnosisPlugin(fastify, options) {
  // Ruta para diagnosticar Redis
  fastify.get('/diagnose-redis', async (request, reply) => {
    const results = {
      redisExists: !!fastify.redis,
      redisMethods: fastify.redis ? Object.keys(fastify.redis) : [],
      diagnostics: []
    };
    
    // Prueba 1: Verificar si podemos hacer ping a Redis
    try {
      const pingResult = await fastify.redis.ping();
      results.diagnostics.push({
        test: 'Redis Ping',
        success: pingResult === 'PONG',
        result: pingResult
      });
    } catch (err) {
      results.diagnostics.push({
        test: 'Redis Ping',
        success: false,
        error: err.message
      });
    }
    
    // Prueba 2: Intentar guardar un valor
    try {
      const setResult = await fastify.redis.set('test-key', 'test-value', 'EX', 60);
      results.diagnostics.push({
        test: 'Redis Set',
        success: setResult === 'OK',
        result: setResult
      });
      
      // Prueba 2.1: Intentar leer el valor
      const getResult = await fastify.redis.get('test-key');
      results.diagnostics.push({
        test: 'Redis Get',
        success: getResult === 'test-value',
        result: getResult
      });
    } catch (err) {
      results.diagnostics.push({
        test: 'Redis Set/Get',
        success: false,
        error: err.message
      });
    }
    
    // Prueba 3: Intentar incrementar un contador (similar a rate-limit)
    try {
      // Limpiar cualquier valor previo
      await fastify.redis.del('test-counter');
      
      // Incrementar
      const incrResult = await fastify.redis.incr('test-counter');
      results.diagnostics.push({
        test: 'Redis Incr',
        success: incrResult === 1,
        result: incrResult
      });
      
      // Establecer expiración
      const expireResult = await fastify.redis.expire('test-counter', 10);
      results.diagnostics.push({
        test: 'Redis Expire',
        success: expireResult === 1,
        result: expireResult
      });
      
      // Obtener TTL
      const ttlResult = await fastify.redis.ttl('test-counter');
      results.diagnostics.push({
        test: 'Redis TTL',
        success: ttlResult > 0 && ttlResult <= 10,
        result: ttlResult
      });
    } catch (err) {
      results.diagnostics.push({
        test: 'Redis Counter Operations',
        success: false,
        error: err.message
      });
    }
    
    // Prueba 4: Verificar la configuración de rate-limit
    const rateLimitConfig = {
      usingRedis: false,
      rateLimitPluginRegistered: false
    };
    
    // Verificar si el plugin rate-limit está registrado
    if (fastify.hasOwnProperty('rateLimit')) {
      rateLimitConfig.rateLimitPluginRegistered = true;
    }
    
    results.rateLimitConfig = rateLimitConfig;
    
    return results;
  });
  
  // Ruta simple para probar el límite de tasa
  fastify.get('/simple-test-limit', {
    config: {
      rateLimit: {
        max: 2,
        timeWindow: '10 seconds'
      }
    }
  }, (request, reply) => {
    reply.send({ 
      message: 'This should be limited to 2 requests per 10 seconds',
      timestamp: new Date().toISOString() 
    });
  });
}

module.exports = fp(diagnosisPlugin, { name: 'diagnosis' })