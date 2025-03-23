'use strict'

// Routes for health check of the auth microservice
async function healthRoutes(fastify, options) {
  // Health check endpoint for the auth microservice
  fastify.get('/health', async (request, reply) => {
    // Check critical components
    const databaseStatus = await checkDatabase(fastify)
    const redisStatus = await checkRedis(fastify)
    const jwtStatus = checkJWT(fastify)
    const securityStatus = checkSecurity(fastify)
    
    const serviceStatus = {
      service: {
        name: fastify.config.serviceName,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.1.0' // Incrementado por las mejoras de seguridad
      },
      dependencies: {
        database: databaseStatus,
        redis: redisStatus,
        jwt: jwtStatus,
        security: securityStatus
      }
    }

    // Si algún componente crítico falla, devolver 503
    const isHealthy = databaseStatus.status === 'healthy' && 
                      redisStatus.status === 'healthy' && 
                      jwtStatus.status === 'healthy' &&
                      securityStatus.status === 'healthy'
    
    if (!isHealthy) {
      serviceStatus.service.status = 'degraded'
      reply.status(503)
    }
    
    return serviceStatus
  })
  
  // Detailed health check for database only
  fastify.get('/health/database', async (request, reply) => {
    const dbStatus = await checkDatabase(fastify)
    
    if (dbStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { database: dbStatus }
  })
  
  // Detailed health check for Redis
  fastify.get('/health/redis', async (request, reply) => {
    const redisStatus = await checkRedis(fastify)
    
    if (redisStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { redis: redisStatus }
  })
  
  // Detailed health check for JWT
  fastify.get('/health/jwt', async (request, reply) => {
    const jwtStatus = checkJWT(fastify)
    
    if (jwtStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { jwt: jwtStatus }
  })
  
  // Detailed health check for security components
  fastify.get('/health/security', async (request, reply) => {
    const securityStatus = checkSecurity(fastify)
    
    if (securityStatus.status !== 'healthy') {
      reply.status(503)
    }
    
    return { security: securityStatus }
  })
}

// Check the status of the database
async function checkDatabase(fastify) {
  try {
    const startTime = Date.now()
    
    // Ejecutar una consulta simple para verificar que la base de datos responde
    await fastify.db.get('SELECT 1 as "check"', [])
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    fastify.logger.error(`Error en health check de base de datos: ${error.message}`)
    return {
      status: 'down',
      error: error.message
    }
  }
}

// Check the status of Redis
async function checkRedis(fastify) {
  try {
    const startTime = Date.now()
    const pong = await fastify.redis.ping()
    const responseTime = Date.now() - startTime
    
    return {
      status: pong === 'PONG' ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    fastify.logger.error(`Error en health check de Redis: ${error.message}`)
    return {
      status: 'down',
      error: error.message
    }
  }
}

// Check JWT configuration
function checkJWT(fastify) {
  try {
    // Verify JWT configuration
    if (!fastify.config.jwt || !fastify.config.jwt.secret) {
      return {
        status: 'down',
        error: 'JWT secret not configured'
      }
    }
    
    // Test JWT functionality with a dummy token
    const testPayload = { test: true }
    const token = fastify.jwt.sign(testPayload)
    const decoded = fastify.jwt.verify(token)
    
    if (!decoded || !decoded.test) {
      return {
        status: 'degraded',
        error: 'JWT sign/verify failed'
      }
    }
    
    return {
      status: 'healthy'
    }
  } catch (error) {
    fastify.logger.error(`Error en health check de JWT: ${error.message}`)
    return {
      status: 'down',
      error: error.message
    }
  }
}

// Check security components
function checkSecurity(fastify) {
  try {
    // Verificar que el módulo de seguridad está configurado
    if (!fastify.security) {
      return {
        status: 'down',
        error: 'Security module not initialized'
      }
    }
    
    // Verificar encriptación
    const testString = 'test-security-string'
    const encrypted = fastify.security.encrypt(testString)
    const decrypted = fastify.security.decrypt(encrypted)
    
    if (decrypted !== testString) {
      return {
        status: 'degraded',
        error: 'Encryption/decryption test failed'
      }
    }
    
    // Verificar circuit breakers
    const circuitStatus = {
      googleOAuth: fastify.security.breakers.googleOAuth.status,
      fortytwoOAuth: fastify.security.breakers.fortytwoOAuth.status
    }
    
    return {
      status: 'healthy',
      encryption: 'working',
      circuitBreakers: circuitStatus
    }
  } catch (error) {
    fastify.logger.error(`Error en health check de seguridad: ${error.message}`)
    return {
      status: 'down',
      error: error.message
    }
  }
}

module.exports = healthRoutes