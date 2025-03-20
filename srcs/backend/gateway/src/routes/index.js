'use strict'

/**
 * Punto de entrada para todas las rutas del gateway
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones
 */
async function routes(fastify, options) {
  // Registrar rutas de API
  fastify.register(require('./api'))
  
  // Registrar ruta de comprobación de salud
  fastify.register(require('./health'))
  
  // Ruta raíz
  fastify.get('/', async (request, reply) => {

	    
	if (fastify.logstash) {
		fastify.logstash.info({
		  message: "Prueba de log",
		});
	}

    return { 
      gateway: 'ft_transcendence API Gateway',
      status: 'active', 
      version: '1.0.0' 
    }
  })
}

module.exports = routes