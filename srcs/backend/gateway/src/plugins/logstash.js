'use strict'

const fp = require('fastify-plugin')
const net = require('net')

/**
 * Plugin para enviar logs a Logstash en formato JSON correcto
 * 
 * @param {FastifyInstance} fastify - Instancia de Fastify
 * @param {Object} options - Opciones del plugin
 */
async function logstashPlugin(fastify, options) {
  const config = fastify.config
  
  // Paths o rutas de métricas que queremos filtrar
  const metricsRoutes = [
    '/metrics',
    '/health',
    '/ping',
    '/status'
  ]

  // Crear cliente TCP para Logstash
  let client = null
  let connected = false
  let reconnectTimer = null
  
  // Función para conectar a Logstash
  function connect() {
    if (client) {
      client.removeAllListeners()
      client.destroy()
    }
    
    const host = process.env.LOGSTASH_HOST || 'logstash'
    const port = parseInt(process.env.LOGSTASH_PORT || '5044')
    
    client = new net.Socket()
    
    client.on('connect', () => {
      connected = true
      console.log(`Conectado a Logstash en ${host}:${port}`)
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    })
    
    client.on('error', (err) => {
      console.error(`Error de conexión a Logstash: ${err.message}`)
      connected = false
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000) // Reintentar cada 5 segundos
      }
    })
    
    client.on('close', () => {
      connected = false
      console.log('Conexión a Logstash cerrada')
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000) // Reintentar cada 5 segundos
      }
    })
    
    client.connect(port, host)
  }
  
  // Conectar al iniciar
  connect()
  
  // Función para enviar logs a Logstash
  function sendLog(level, data, message) {
    // No enviar logs si no estamos conectados
    if (!connected || !client) {
      return
    }
    
    try {
      // Preparar los datos del log - asegurándose de que message sea un campo de primer nivel
      const logData = {
        // Campos estándar de Logstash
        '@timestamp': new Date().toISOString(),
        '@version': '1',
        // Campos personalizados
        service: 'gateway',
        env: config.env || 'production',
        host: process.env.HOSTNAME || 'gateway',
        level: level
      }
      
      // Añadir los datos adicionales, pero evitando campos reservados
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          // No sobreescribir campos estándar
          if (!['@timestamp', '@version', 'message'].includes(key)) {
            logData[key] = data[key]
          }
        })
      }
      
      // Priorizar el mensaje del segundo parámetro, luego data.message
      if (message) {
        logData.message = message
      } else if (data && data.message) {
        logData.message = data.message
      }
      
      // Convertir a JSON y enviar con un salto de línea al final
      const logString = JSON.stringify(logData) + '\n'
      client.write(logString)
    } catch (err) {
      console.error(`Error al enviar log a Logstash: ${err.message}`)
    }
  }
  
  // Decorar Fastify con el logger
  fastify.decorate('logstash', {
    info: (data, msg) => {
      // Si es un objeto de log y tiene una URL que corresponde a métricas, no lo logueamos
      if (data && typeof data === 'object' && data.url && 
          metricsRoutes.some(route => data.url.startsWith(route))) {
        return // Filtrar rutas de métricas
      }
      sendLog('info', data, msg)
    },
    error: (data, msg) => {
      // Para errores, siempre logueamos sin importar la ruta
      sendLog('error', data, msg)
    },
    warn: (data, msg) => {
      // Filtrar logs de warn para métricas
      if (data && typeof data === 'object' && data.url && 
          metricsRoutes.some(route => data.url.startsWith(route))) {
        return
      }
      sendLog('warn', data, msg)
    },
    debug: (data, msg) => {
      // Filtrar logs de debug para métricas
      if (data && typeof data === 'object' && data.url && 
          metricsRoutes.some(route => data.url.startsWith(route))) {
        return
      }
      sendLog('debug', data, msg)
    }
  })
  
  // Cerrar conexión al salir
  process.on('exit', () => {
    if (client) {
      client.destroy()
    }
  })
}

module.exports = fp(logstashPlugin, {
  name: 'logstash'
})