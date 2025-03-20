'use strict'

require('dotenv').config()

const Fastify = require('fastify')
const config = require('./config')
const pino = require('pino')

// Custom configuration for pino
const pinoOptions = {
  level: config.logLevel || 'info',
  formatters: { level: (label) => { return { level: label }}, bindings: () => ({})},
  messageKey: 'message',
  transport: config.isDev ? {
    target: 'pino-pretty',
    options: {
      translateTime: false,                  // Do not show timestamp
      ignore: 'pid,hostname,level,time,env', // Ignore these fields
      messageFormat: '{msg}',                // Only display the message
      singleLine: true,                      // One line per log
      colorize: false,                       // No colors
      levelFirst: false                      // Do not show level first
    }
  } : undefined
}

const logger = pino(pinoOptions)
const app = Fastify({ logger: logger })

app.decorate('config', config)

// Register plugins
app.register(require('./plugins/logger'))
app.register(require('./plugins/logstash'))
app.register(require('./plugins/metrics'), { metrics: config.metrics })
app.register(require('./plugins/redis'))
app.register(require('./plugins/auth'))
app.register(require('./plugins/proxy'))

// Register middlewares
app.register(require('@fastify/cors'), config.cors)
app.register(require('@fastify/rate-limit'), config.rateLimit)
app.register(require('@fastify/helmet'))
app.register(require('@fastify/sensible'))

// Register routes
app.register(require('./routes'))

// Handle errors
app.setErrorHandler((error, request, reply) => {
  app.log.error(`Error: ${error.message}`);
  
  // Send to logstash if available
  if (app.logstash) {
    app.logstash.error({ 
      error: error.message, 
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode
    }, 'Request failed');
  }
  
  let statusCode = error.statusCode || 500;
  const response = { error: statusCode >= 500 && !config.isDev ? 'Internal Server Error' : error.message, statusCode, };

  reply.status(statusCode).send(response);
})

// Start server
const start = async () => {
  try {
    app.listen({ port: config.port, host: config.host });
    console.log(`${config.serviceName} listening on port ${config.port}`);
  } catch (err) {
    console.error(`Error starting ${config.serviceName}: ${err.message}`);
    process.exit(1);
  }
}

start();
