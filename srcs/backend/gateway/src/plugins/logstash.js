'use strict'

const fp = require('fastify-plugin')
const net = require('net')

/**
 * Plugin for logging with Logstash
 * 
 * @param {FastifyInstance} fastify		Fastify instance
 * @param {Object} options				Plugin options
 */
async function logstashPlugin(fastify, options) {
  const config = fastify.config
  
  // Metric routes to filter
  const metricsRoutes = [ '/metrics', '/health', '/ping', '/status' ]

  // Create TCP client
  let client = null
  let connected = false
  let reconnectTimer = null
  
  // Connect to Logstash
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
      console.log(`Logstash connected on port ${port}`)
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    })
    
    client.on('error', (err) => {
      //console.error(`Logstash: connection error: ${err.message}`)
      connected = false
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000) // retry every 5 seconds
      }
    })
    
    client.on('close', () => {
      connected = false
      //console.log('Logstash connection closed')
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000) // retry every 5 seconds
      }
    })
    
    client.connect(port, host)
  }
  
  connect()

  // Send logs to Logstash
  function sendLog(level, data, message) {
    if (!connected || !client) return
    
    try {
      const logData = {
        '@timestamp': new Date().toISOString(),
        '@version': '1',
        service: `${fastify.config.serviceName}`,
        env: config.env || 'production',
        host: `${fastify.config.serviceName}`,
        level: level
      }
      
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (!['@timestamp', '@version', 'message'].includes(key)) logData[key] = data[key]
        })
      }
      
      if (message)						logData.message = message
	  else if (data && data.message)	logData.message = data.message
      
      // Convert to JSON
      const logString = JSON.stringify(logData) + '\n'
      client.write(logString)
	  console.log('%s log: %s', fastify.config.serviceName, logData.message)
    } catch (err) {
      console.error(`Error al enviar log a Logstash: ${err.message}`)
    }
  }
  
  // Decorate log with Fastify
  fastify.decorate('logstash', {
    info: (data, msg) => { sendLog('info', data, msg) },
    error: (data, msg) => { sendLog('error', data, msg) },
    warn: (data, msg) => { sendLog('warn', data, msg) },
    debug: (data, msg) => { sendLog('debug', data, msg) }
  })
  
  // Close connection on exit
  process.on('exit', () => { if (client) client.destroy() })
}

module.exports = fp(logstashPlugin, { name: 'logstash' })
