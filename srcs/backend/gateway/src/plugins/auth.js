'use strict'

const fp = require('fastify-plugin')
const jwt = require('jsonwebtoken')
const axios = require('axios')

// Plugin for authentication and token management
async function authPlugin(fastify, options) {
  const config = fastify.config
  
  // Token cache expiration time (5 minutes)
  const TOKEN_CACHE_TTL = 300
  
  // Prefix for Redis keys
  const CACHE_PREFIX = 'auth:token:'
  const USER_INFO_PREFIX = 'auth:user:'
  
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
      fastify.logger.error(`Error decoding token: ${error.message}`, {
        error: error.message,
        stack: error.stack
      })
      return null
    }
  })
  
  // Function to validate token against auth service
  fastify.decorate('validateToken', async function(token) {
    // Create Redis key
    const cacheKey = `${CACHE_PREFIX}${token}`
    
    // Check if token validation result is in cache
    let authInfo = await fastify.cache.get(cacheKey)
    if (authInfo) {
      return authInfo
    }
    
    // If not in cache, verify token with auth service
    try {
      const authService = fastify.config.services.auth
      const response = await axios.get(`${authService.url}/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      })
      
      // Process the response
      if (response.data && response.data.valid) {
        authInfo = {
          authenticated: true,
          userId: response.data.user_info.user_id,
          roles: response.data.user_info.roles || [],
          email: response.data.user_info.email,
          username: response.data.user_info.username,
          userInfo: response.data.user_info,
          token: token
        }
        
        // Store in cache
        await fastify.cache.set(cacheKey, authInfo, TOKEN_CACHE_TTL)
        
        // Also store user information for quick lookups
        const userKey = `${USER_INFO_PREFIX}${authInfo.userId}`
        await fastify.cache.set(userKey, response.data.user_info, TOKEN_CACHE_TTL * 2) // Longer TTL for user info
        
        return authInfo
      } else {
        return { authenticated: false, reason: 'invalid-token' }
      }
    } catch (error) {
      fastify.logger.error(`Error validating token with auth service: ${error.message}`, {
        error: error.message,
        stack: error.stack
      })
      
      // In case of error, try to decode locally for more specific messages
      const decoded = fastify.decodeToken(token)
      
      if (!decoded) {
        return { authenticated: false, reason: 'invalid-format' }
      }
      
      // Check token expiration if available
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return { authenticated: false, reason: 'token-expired' }
      }
      
      return { authenticated: false, reason: 'service-unavailable' }
    }
  })
  
  // Middleware to process tokens on all routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      // Routes that do not require authentication
      const publicPaths = ['/auth/login', '/auth/register', '/auth/password/reset-request', 
                          '/auth/password/reset', '/auth/oauth', '/health', '/metrics']
      
      // Check if route matches any public path
      const isPublicRoute = publicPaths.some(path => request.url.startsWith(path))
      
      if (isPublicRoute) {
        request.auth = { authenticated: false, reason: 'public-route' }
        return
      }
      
      // Extract token
      const token = fastify.extractToken(request)
      if (!token) {
        request.auth = { authenticated: false, reason: 'no-token' }
        return
      }
      
      // Validate token (using cache or auth service)
      const authInfo = await fastify.validateToken(token)
      
      // Attach auth info to request
      request.auth = authInfo
      
      // If authenticated, attach user information to request
      if (authInfo.authenticated) {
        request.user = authInfo.userInfo
      }
      
    } catch (error) {
      fastify.logger.error(`Error in authentication middleware: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        path: request.url
      })
      
      // Do not block the request, just mark it as unauthenticated
      request.auth = { authenticated: false, reason: 'error', message: error.message }
    }
  })
  
  // Middleware for routes that require authentication
  fastify.decorate('authenticate', async (request, reply) => {
    if (!request.auth || !request.auth.authenticated) {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      return
    }
  })
  
  // Middleware for routes that require specific roles
  fastify.decorate('requireRoles', function(rolesRequired = []) {
    return async (request, reply) => {
      // First, check if authenticated
      if (!request.auth || !request.auth.authenticated) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required'
        })
        return
      }
      
      // If no specific roles are required, already authorized
      if (rolesRequired.length === 0) return
      
      // Check if the user has at least one of the required roles
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
  })
  
  // Decorate with authentication service
  fastify.decorate('authService', {
    // Get user info by ID
    getUserInfo: async function(userId) {
      // Try to get from cache first
      const cacheKey = `${USER_INFO_PREFIX}${userId}`
      const cachedInfo = await fastify.cache.get(cacheKey)
      
      if (cachedInfo) return cachedInfo
      
      // If not in cache, get from auth service
      try {
        const authService = fastify.config.services.auth
        const token = request.headers.authorization
        
        const response = await axios.get(`${authService.url}/me`, {
          headers: {
            'Authorization': token
          },
          timeout: 5000
        })
        
        if (response.data) {
          // Store in cache
          await fastify.cache.set(cacheKey, response.data, TOKEN_CACHE_TTL * 2)
          return response.data
        }
      } catch (error) {
        fastify.logger.error(`Error getting user info: ${error.message}`, {
          error: error.message,
          stack: error.stack,
          userId
        })
      }
      
      return null
    },
    
    // Revoke token
    revokeToken: async function(token) {
      // Remove from cache
      await fastify.cache.del(`${CACHE_PREFIX}${token}`)
      
      // Try to revoke in the auth service
      try {
        const authService = fastify.config.services.auth
        await axios.post(`${authService.url}/logout`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000
        })
        return true
      } catch (error) {
        fastify.logger.warn(`Error revoking token in auth service: ${error.message}`, {
          error: error.message
        })
        // Still consider it successful because it was removed from local cache
        return true
      }
    }
  })
  
  fastify.logger.info('Auth plugin configured correctly')
}

module.exports = fp(authPlugin, { name: 'auth', dependencies: ['logger'] })