export default async function (fastify, opts) {
  // Obtener todos los usuarios
  fastify.get("/users", async (request, reply) => {
    try {
      const users = await fastify.getUsers()
      return { users }
    } catch (err) {
      reply.code(500)
      return { error: err.message }
    }
  })

  // Crear un nuevo usuario
  fastify.post(
    "/users",
    {
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { username } = request.body
        const user = await fastify.createUser(username)

        // Guardamos en caché con Redis
        await fastify.redis.set(`user:${user.id}`, JSON.stringify(user))

        reply.code(201)
        return user
      } catch (err) {
        reply.code(400)
        return { error: err.message }
      }
    },
  )

  // Obtener un usuario por ID
  fastify.get(
    "/users/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params

        // Intentamos obtener de la caché primero
        const cachedUser = await fastify.redis.get(`user:${id}`)
        if (cachedUser) {
          return JSON.parse(cachedUser)
        }

        // Si no está en caché, consultamos la base de datos
        const users = await fastify.getUsers()
        const user = users.find((u) => u.id === Number.parseInt(id))

        if (!user) {
          reply.code(404)
          return { error: "User not found" }
        }

        // Guardamos en caché para futuras consultas
        await fastify.redis.set(`user:${id}`, JSON.stringify(user))

        return user
      } catch (err) {
        reply.code(500)
        return { error: err.message }
      }
    },
  )
}

