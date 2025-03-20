import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Example route
fastify.get('/', async (request, reply) => {
  return { message: 'Welcome to Gateway Service' };
});

// Run the server
const start = async () => {
  try {
    // Using 0.0.0.0 to allow external connections in Docker
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();