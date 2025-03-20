'use strict'

const path = require('path')
const fastify = require('fastify')
const autoload = require('@fastify/autoload')
const config = require('./config')

// Aumentar el límite de event listeners para evitar warnings
process.setMaxListeners(15)

// Crear la instancia de Fastify con configuración simple
const server = fastify({
  logger: true,
  pluginTimeout: 30000
})

// Registrar plugins básicos
server.register(require('@fastify/cors'))
server.register(require('@fastify/helmet'))
server.register(require('@fastify/sensible'))

// Registrar todos los plugins automáticamente
server.register(autoload, {
  dir: path.join(__dirname, 'plugins'),
  options: Object.assign({}, config)
})

// Registrar todas las rutas automáticamente
server.register(autoload, {
  dir: path.join(__dirname, 'routes'),
  options: Object.assign({}, config)
})

// Manejador de error global
server.setErrorHandler((error, request, reply) => {
  server.log.error(error)
  reply.status(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'Error interno del servidor',
    statusCode: error.statusCode || 500
  })
})

// Iniciar el servidor
const start = async () => {
  try {
    await server.listen({ 
      port: config.port, 
      host: config.host 
    })
    
    console.log(`Servidor ejecutándose en ${server.server.address().port}`)
  } catch (err) {
    console.error(`Error al iniciar el servidor: ${err.message}`)
    process.exit(1)
  }
}

start()