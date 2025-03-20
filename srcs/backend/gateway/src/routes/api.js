'use strict'

/**
 * Rutas específicas del gateway y endpoints personalizados
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones
 */
async function apiRoutes(fastify, options) {
  // Ruta de información sobre servicios
  fastify.get('/services', async (request, reply) => {
    // Lista de servicios disponibles (sin exponer detalles internos)
    const serviceInfo = Object.entries(fastify.config.services).map(([name, config]) => ({
      name,
      prefix: config.prefix,
      available: true // Aquí podrías hacer health checks reales
    }))
    
    return { services: serviceInfo }
  })

  // Esta ruta requiere autenticación como ejemplo
  fastify.get('/profile', { preHandler: fastify.authenticate }, async (request, reply) => {
    // El middleware authenticate ya verificó el token y agregó request.user
    
    // Esta ruta podría obtener datos del servicio de usuario, por ejemplo
    return { 
      profile: request.user,
      message: 'Esta es información del perfil protegida' 
    }
  })

  // Ejemplo de endpoint con caché
  fastify.get('/cached-example', async (request, reply) => {
    const cacheKey = 'cached-example'
    
    // Intentar obtener desde caché
    const cachedData = await fastify.cache.get(cacheKey)
    if (cachedData) {
      fastify.log.info('Sirviendo datos desde caché')
      return cachedData
    }
    
    // Si no está en caché, generar datos nuevos
    const data = {
      message: 'Estos datos serán cacheados',
      timestamp: new Date().toISOString(),
      expires: 'en 60 segundos'
    }
    
    // Guardar en caché por 60 segundos
    await fastify.cache.set(cacheKey, data, 60)
    
    return data
  })
}

module.exports = apiRoutes