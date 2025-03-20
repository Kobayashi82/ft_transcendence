'use strict'

const fp = require('fastify-plugin')
const net = require('net')

// Plugin for logging with Logstash
async function logstashPlugin(fastify, options) {
  const config = fastify.config

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
      connected = false
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000)
      }
    })
    
    client.on('close', () => {
      connected = false
      
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 5000)
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
        service: `${fastify.config.serviceName}`,
        env: config.env || 'production',
        host: `${fastify.config.serviceName}`,
        level: level
      }
      
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (!['@timestamp', 'message'].includes(key)) logData[key] = data[key]
        })
      }
      
      if (message)						logData.message = message
	  else if (data && data.message)	logData.message = data.message
      
      // Convert to JSON
      const logString = JSON.stringify(logData) + '\n'
      client.write(logString)
    } catch (err) {
    }
  }
  
  // Decorate log with Fastify
  fastify.decorate('logstash', {
	isConnected: () => connected && client !== null,
	info: (data, msg) =>	{ if (connected && client) sendLog('info', data, msg);  },
	error: (data, msg) =>	{ if (connected && client) sendLog('error', data, msg); },
	warn: (data, msg) =>	{ if (connected && client) sendLog('warn', data, msg);  },
	debug: (data, msg) =>	{ if (connected && client) sendLog('debug', data, msg); }
  })
  
  // Close connection on exit
  process.on('exit', () => { if (client) client.destroy() })
}

module.exports = fp(logstashPlugin, { name: 'logstash' })
