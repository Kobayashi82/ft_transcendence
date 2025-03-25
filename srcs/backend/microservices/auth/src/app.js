'use strict'

const fastify = require('fastify')
const config = require('./config')

const app = fastify({ logger: false, trustProxy: true })

app.decorate('config', config)

app.register(require('./plugins/logger'))
app.register(require('./plugins/metrics'))

app.register(require('./plugins/redis'))
app.register(require('./plugins/db'), { database: config.database })

app.register(require('@fastify/sensible'))
app.register(require('./plugins/helmet'))
app.register(require('./plugins/security'))
app.register(require('./plugins/error-handler'))

app.register(require('@fastify/cookie'), { secret: config.cookie.secret, parseOptions: config.cookie.options });
app.register(require('./plugins/jwt'))
app.register(require('./plugins/auth'))

app.register(require('@fastify/swagger'), { swagger: config.swagger });
app.register(require('./routes'), { prefix: '' })

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
