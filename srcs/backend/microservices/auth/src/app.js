'use strict'

const fastify = require('fastify')
const config = require('./config')
const app = fastify({ logger: false, trustProxy: true })

app.decorate('config', config)
app.register(require('./plugins/logger'))
app.register(require('./plugins/metrics'))
app.register(require('./plugins/redis'))
app.register(require('@fastify/cookie'), { secret: config.cookie.secret, parseOptions: config.cookie.options });
app.register(require('./plugins/security'))
app.register(require('./plugins/jwt'))
app.register(require('./plugins/auth'))
app.register(require('./plugins/db'), { database: config.database })
app.register(require('./plugins/helmet'))
app.register(require('./plugins/error-handler'))
app.register(require('@fastify/sensible'))
app.register(require('./routes'), { prefix: '' })

// Shutdown
const gracefulShutdown = async () => {
  try {
    await app.close()
    console.log('Server shut down successfully')
    process.exit(0)
  } catch (err) {
    console.error('Error shutting down the server:', err)
    process.exit(1)
  }
}

// Start
const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host })
    console.log(`${config.serviceName.charAt(0).toUpperCase() + config.serviceName.slice(1)} listening on port ${config.port}`)
    
    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)
  } catch (err) {
    console.error(`Error starting ${config.serviceName}: ${err.message}`)
    process.exit(1)
  }
}

start()