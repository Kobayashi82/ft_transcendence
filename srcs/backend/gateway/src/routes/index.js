'use strict'

async function routes(fastify, options) {

  fastify.register(require('./api'))
  fastify.register(require('./health'))

  fastify.get('/', (request, reply) => {
    fastify.redis.set('otrokey2', 'algo2')
    reply.send({ message: `${new Date().toISOString()} Hello, world!` });
  });

}

module.exports = routes
