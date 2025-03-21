'use strict'

async function routes(fastify, options) {

  fastify.register(require('./api'))
  fastify.register(require('./health'))
  
  fastify.get('/', async (request, reply) => {

	// Example of logs
	console.log('Your message here')		        // Log using console
	fastify.logger.info("Tu mensaje aquí", {    // Log using logstash
	  userId: 123,
	  action: "login"
	});

	// Example of redis
	await fastify.cache.set('my-key', { mensaje: 'Hello world' }, 60); // TTL: 60 seconds (time the value will be in cache)
	const result = await fastify.cache.get('my-key');
	console.log(result.mensaje);

    return { 
      gateway: 'gateway',
      status: 'active', 
      version: '1.0.0' 
    }
  })

}

module.exports = routes
