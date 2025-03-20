import fp from "fastify-plugin"
import winston from "winston"
import LogstashTransport from "winston-logstash-transport"

export default fp(async (fastify, opts) => {
  // Configuración del logger
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`
      }),
    ),
    transports: [
      new winston.transports.Console(),
      new LogstashTransport({
        host: "logstash",
        port: 5044,
        ssl_enable: false,
      }),
    ],
  })

  // Decorar Fastify con el logger
  fastify.decorate("customLogger", logger)

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
})

