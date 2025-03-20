'use strict'

async function routes(fastify, options) {

  fastify.register(require('./api'))
  fastify.register(require('./health'))
  
  fastify.get('/', async (request, reply) => {

	// Example of logs
	console.log('Your message here')		// Log using console
	fastify.logstash.info({					// Log using logstash
	  message: "Your message here",
	  userId: 123,
	  action: "login"
	});

	// Example of redis
	await fastify.cache.set('my-key', { mensaje: 'Hello world' }, 60); // TTL: 60 seconds (time the value will be in cache)
	const result = await fastify.cache.get('my-key');
	console.log(result.mensaje);

    return { 
      gateway: 'ft_transcendence API Gateway',
      status: 'active', 
      version: '1.0.0' 
    }
  })

}

module.exports = routes
