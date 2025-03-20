// Importamos las dependencias
import "dotenv/config"
import Fastify from "fastify"
import autoload from "@fastify/autoload"
import helmet from "@fastify/helmet"
import cors from "@fastify/cors"
import redis from "@fastify/redis"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { register, collectDefaultMetrics } from "./src/plugins/metrics.js"

process.setMaxListeners(15);

// Obtenemos el directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuración del servidor
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  trustProxy: true,
})

// Registramos plugins
await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
})

// Registramos Redis
await fastify.register(redis, {
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
  onError: (err) => {
    fastify.log.error("Redis error:", err);
  },
  connectTimeout: 10000 // 10 segundos
})

// Registramos las métricas de Prometheus
await collectDefaultMetrics()
fastify.get("/metrics", async (request, reply) => {
  reply.header("Content-Type", register.contentType)
  return register.metrics()
})

// Registramos nuestros plugins y rutas
await fastify.register(autoload, {
  dir: join(__dirname, "src", "plugins"),
  options: {},
})

await fastify.register(autoload, {
  dir: join(__dirname, "src", "routes"),
  options: {},
})

// Iniciamos el servidor
const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 3000,
      host: "0.0.0.0",
    })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

