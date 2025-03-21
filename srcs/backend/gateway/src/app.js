'use strict'

require('dotenv').config()

const fastify = require('fastify')
const config = require('./config')

const app = fastify({ logger: false })

app.decorate('config', config)

// Register plugins
app.register(require('./plugins/logger'))
app.register(require('./plugins/metrics'))
app.register(require('./plugins/redis'))
app.register(require('./plugins/auth'))
app.register(require('./plugins/proxy'))
app.register(require('./plugins/error-handler'))

// Register middlewares
app.register(require('@fastify/cors'), config.cors)
app.register(require('@fastify/rate-limit'), config.rateLimit)
app.register(require('@fastify/helmet'))
app.register(require('@fastify/sensible'))

// Register routes
app.register(require('./routes'))

// Start
const start = async () => {
  try {
    app.listen({ port: config.port, host: config.host })
    console.log(`${config.serviceName.charAt(0).toUpperCase() + config.serviceName.slice(1)} listening on port ${config.port}`)
    
    process.on('SIGINT', gracefulShutdown)
    process.on('SIGTERM', gracefulShutdown)
  } catch (err) {
    console.error(`Error starting ${config.serviceName}: ${err.message}`)
    process.exit(1)
  }
}

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

start()
