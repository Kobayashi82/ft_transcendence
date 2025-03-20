'use strict'

module.exports = async function (fastify, opts) {
  // Ejemplo de ruta con SQLite
  fastify.get('/hello', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }
  }, async function (request, reply) {
    const name = request.query.name || 'mundo'
    
    // Ejemplo de uso de Redis para caché
    const cacheKey = `hello:${name}`
    const cachedResponse = await fastify.cacheGet(cacheKey)
    
    if (cachedResponse) {
      fastify.log.info(`Respuesta recuperada de caché para ${name}`)
      return cachedResponse
    }
    
    // Guardar ejemplo en la base de datos
    const example = await fastify.addExample(name)
    
    // Registrar en Logstash
    fastify.logstash.info('Hello request', { name, id: example.id })
    
    const response = {
      message: `¡Hola, ${name}!`,
      id: example.id,
      timestamp: new Date().toISOString()
    }
    
    // Guardar respuesta en caché
    await fastify.cacheSet(cacheKey, response, 60) // 60 segundos TTL
    
    return response
  })
  
  // Ejemplo de ruta para obtener todos los ejemplos
  fastify.get('/examples', async function (request, reply) {
    const examples = await fastify.getExamples()
    return { examples }
  })
}