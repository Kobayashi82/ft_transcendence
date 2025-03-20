'use strict'

const fp = require('fastify-plugin')
const jwt = require('jsonwebtoken')

// Plugin for basic authentication in the gateway
// Implements minimal verification and token information extraction
async function authPlugin(fastify, options) {
  const config = fastify.config
  
  // Token cache expiration time (in seconds)
  const TOKEN_CACHE_TTL = 300 // 5 minutes
  
  // Prefix for Redis keys
  const CACHE_PREFIX = 'auth:token:'
  
  // Function to extract and minimally verify the token
  fastify.decorate('extractToken', function(request) {
    // Check if the authorization header exists
    const authHeader = request.headers.authorization
    if (!authHeader) return null
    
    // Verify correct format (Bearer token)
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    // Return the token
    return parts[1]
  })
  
  // Function to decode a JWT token without cryptographic validation
  fastify.decorate('decodeToken', function(token) {
    try {
      // Basic decoding without verifying the signature
      // IMPORTANT: This only extracts data, it does not validate the token
      return jwt.decode(token)
    } catch (error) {
      console.error(`Error decoding token: ${error.message}`)
      return null
    }
  })
  
  // Middleware to process tokens on all routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      // Routes that do not require authentication
      const publicPaths = ['/auth', '/health', '/metrics' ]
      if (publicPaths.some(path => request.url.startsWith(path))) { return }
      
      // Extract token
      const token = fastify.extractToken(request)
      if (!token) {
        request.auth = { authenticated: false, reason: 'no-token' }
        return
      }
      
      // Create Redis key
      const cacheKey = `${CACHE_PREFIX}${token}`
      
      // Check if the token is in cache
      let authInfo = await fastify.cache.get(cacheKey)
      if (authInfo) {
        request.auth = authInfo
        return
      }
      
      // Decode token for basic information extraction
      const decoded = fastify.decodeToken(token)
      if (!decoded) {
        request.auth = { authenticated: false, reason: 'invalid-format' }
        return
      }
      
      // NOTE: In the future, verification would be done with the auth service
      
      // Extract relevant information for routing decisions
      authInfo = {
        authenticated: true, // This will actually be determined by the auth service
        userId: decoded.sub || decoded.userId,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        token: token
      }
      
      // Save in cache using the helper you already have
      await fastify.cache.set(cacheKey, authInfo, TOKEN_CACHE_TTL)
      
      // Attach to the request for later use
      request.auth = authInfo
      
    } catch (error) {
      console.error(`Error in authentication middleware: ${error.message}`)
      // Do not block the request, just mark it as unauthenticated
      request.auth = { authenticated: false, reason: 'error', message: error.message }
    }
  })
  
  // Helper function to verify authorization requirements (future use)
  fastify.decorate('requireAuth', function(rolesRequired = []) {
    return async (request, reply) => {
      if (!request.auth || !request.auth.authenticated) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required'
        })
        return
      }
      
      // If specific roles are required, check them
      if (rolesRequired.length > 0) {
        const hasRequiredRole = request.auth.roles.some(role => rolesRequired.includes(role))
        
        if (!hasRequiredRole) {
          reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
          })
          return
        }
      }
    }
  })
  
  // Prepare for future communication with the authentication service
  fastify.decorate('authService', {
    validateToken: async function(token) {
      // Future implementation - call to the authentication service
      // For now, simply return local decoding
      return { valid: !!fastify.decodeToken(token), decoded: fastify.decodeToken(token) }
    },
	// Remove from cache when a token is invalidated
    invalidateToken: async function(token) { await fastify.cache.del(`${CACHE_PREFIX}${token}`) }
  })
}

module.exports = fp(authPlugin, { name: 'auth', dependencies: ['redis'] })
