const path = require("path")
const AutoLoad = require("@fastify/autoload")
const fastifyHelmet = require("@fastify/helmet")
const fastifyCors = require("@fastify/cors")
const winston = require("winston")
const { createLogger, format, transports } = winston
const { combine, timestamp, printf } = format
const LogstashTransport = require("winston-logstash-transport")

// Configuración del logger
const logger = createLogger({
  level: "info",
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`
    }),
  ),
  transports: [
    new transports.Console(),
    new LogstashTransport({
      host: "logstash",
      port: 5044,
      ssl_enable: false,
    }),
  ],
})

// Exportamos una función que inicializa el servidor Fastify
module.exports = async (fastify, opts) => {
  // Registramos plugins

  // Métricas para Prometheus
  await fastify.register(require("./plugins/metrics"))

  // Conexión a Redis
  await fastify.register(require("@fastify/redis"), {
    host: process.env.REDIS_HOST || "redis",
    port: process.env.REDIS_PORT || 6379,
  })

  // Conexión a SQLite
  await fastify.register(require("@fastify/better-sqlite3"), {
    filepath: path.join(__dirname, "..", "data", "database.sqlite"),
  })

  // Seguridad con Helmet
  await fastify.register(fastifyHelmet)

  // CORS para permitir solicitudes desde el frontend
  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || "*",
  })

  // Cargamos automáticamente todas las rutas
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: Object.assign({}, opts),
  })

  // Cargamos automáticamente todos los plugins
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: Object.assign({}, opts),
  })

  // Middleware para logging
  fastify.addHook("onRequest", (request, reply, done) => {
    logger.info(`${request.method} ${request.url}`)
    done()
  })

  // Manejador de errores
  fastify.setErrorHandler((error, request, reply) => {
    logger.error(`Error: ${error.message}`)
    reply.status(error.statusCode || 500).send({ error: error.message })
  })
}

