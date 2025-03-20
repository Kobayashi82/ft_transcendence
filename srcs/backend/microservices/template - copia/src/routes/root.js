export default async function (fastify, opts) {
  fastify.get("/", async (request, reply) => {
    return { message: "Template microservice is running!" }
  })

  fastify.get("/health", async (request, reply) => {
    return { status: "ok" }
  })
}

