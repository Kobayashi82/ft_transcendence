'use strict'

const healthSchema = require('../schemas/health')

async function healthRoutes(fastify, options) {

  fastify.get('/internal/health', { schema: healthSchema.schema }, async (request, reply) => {
    const databaseStatus = await checkDatabase(fastify)
    const redisStatus = await checkRedis(fastify)
    const jwtStatus = checkJWT(fastify)
    const securityStatus = checkSecurity(fastify)
    
    const serviceStatus = {
      service: {
        name: fastify.config.name,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0'
      },
      dependencies: {
        database: databaseStatus,
        redis: redisStatus,
        jwt: jwtStatus,
        security: securityStatus
      }
    }
    const isHealthy = databaseStatus.status === 'healthy' && redisStatus.status === 'healthy' && jwtStatus.status === 'healthy' && securityStatus.status === 'healthy'
    if (!isHealthy) { serviceStatus.service.status = 'degraded'; reply.status(503) }

    return serviceStatus
  })
}

  // Check SQLite
async function checkDatabase(fastify) {
  try {
    // Run a simple query to verify
    const startTime = Date.now()
    await fastify.db.get('SELECT 1 as "check"', [])
    const responseTime = Date.now() - startTime
    
    return { status: 'healthy', responseTime: `${responseTime}ms` }
  } catch (error) {
    fastify.logger.error(`Error en health check de base de datos: ${error.message}`)

    return { status: 'down', error: error.message }
  }
}

// Check Redis
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

    return { status: 'down', error: error.message }
  }
}

// Check JWT configuration
function checkJWT(fastify) {
  try {
    if (!fastify.config.jwt || !fastify.config.jwt.secret) { return { status: 'down', error: 'JWT secret not configured' }}
    
    const testPayload = { test: true }
    const token = fastify.jwt.sign(testPayload)
    const decoded = fastify.jwt.verify(token)
    
    if (!decoded || !decoded.test) { return { status: 'degraded', error: 'JWT sign/verify failed' }}
    
    return { status: 'healthy' }
  } catch (error) {
    fastify.logger.error(`Error en health check de JWT: ${error.message}`)

    return { status: 'down', error: error.message }
  }
}

// Check security components
function checkSecurity(fastify) {
  try {
    if (!fastify.security) { return { status: 'down', error: 'Security module not initialized' }}
    
    // Verify encryption
    const testString = 'test-security-string'
    const encrypted = fastify.security.encrypt(testString)
    const decrypted = fastify.security.decrypt(encrypted)
    
    if (decrypted !== testString) {
      return { status: 'degraded', error: 'Encryption/decryption test failed' }}
    
    // Check circuit breakers
    const circuitStatus = {
      googleOAuth: fastify.security.breakers.googleOAuth.status,
      fortytwoOAuth: fastify.security.breakers.fortytwoOAuth.status
    }
    
    return { status: 'healthy', encryption: 'working', circuitBreakers: circuitStatus }
  } catch (error) {
    fastify.logger.error(`Security health check failure: ${error.message}`)

    return { status: 'down', error: error.message }
  }
}

module.exports = healthRoutes
