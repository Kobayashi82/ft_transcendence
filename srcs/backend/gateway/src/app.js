'use strict'

const fastify = require('fastify')
const config = require('./config')

const app = fastify({ logger: false })

app.decorate('config', config)

app.decorate('generateId', function() { return require('uuid').v4(); });

// Register plugins
app.register(require('./plugins/logger'))
app.register(require('./plugins/metrics'))
app.register(require('./plugins/redis'))
app.register(require('./plugins/auth'))
app.register(require('./plugins/rate-limit'))
app.register(require('./plugins/proxy'))
app.register(require('./plugins/error-handler'))

// Register middlewares
app.register(require('@fastify/cors'), config.cors)
app.register(require('@fastify/helmet'))
app.register(require('@fastify/sensible'))

// Register routes
app.register(require('./routes'))

// Shutdown
const gracefulShutdown = async () => {
  try {
    await app.close()
    console.log('[INFO] Server shut down successfully')
    process.exit(0)
  } catch (err) {
    console.error('[ERROR] Server shutdown failure:', err)
    process.exit(1)
  }
}

// Start
const start = async () => {
  try {
    await app.ready()
    await app.listen({ port: config.port, host: config.host })
    console.log(`[INFO] ${config.serviceName.charAt(0).toUpperCase() + config.serviceName.slice(1)} listening on port ${config.port}`)
    
    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)
  } catch (err) {
    console.error(`[ERROR] Service ${config.serviceName} startup failed: ${err.message}`)
    process.exit(1)
  }
}

start()
