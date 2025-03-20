'use strict'

// Specific gateway routes and custom endpoints
async function apiRoutes(fastify, options) {

  // This route requires authentication as an example
  fastify.get('/profile', { preHandler: fastify.authenticate }, async (request, reply) => {
    // The authenticate middleware has already verified the token and added request.user
    
    // This route could fetch data from a user service, for example
    return { 
      profile: request.user,
      message: 'This is protected profile information' 
    }
  })

  // Example endpoint with cache
  fastify.get('/cached-example', async (request, reply) => {
    const cacheKey = 'cached-example'
    
    // Try to get data from cache
    const cachedData = await fastify.cache.get(cacheKey)
    if (cachedData) {
      console.log('Serving data from cache')
      return cachedData
    }
    
    // If not in cache, generate new data
    const data = {
      message: 'This data will be cached',
      timestamp: new Date().toISOString(),
      expires: 'in 60 seconds'
    }
    
    // Guardar en caché por 60 segundos
    await fastify.cache.set(cacheKey, data, 60)
    
    return data
  })
}

module.exports = apiRoutes
