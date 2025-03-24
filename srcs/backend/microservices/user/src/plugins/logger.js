'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

/**
 * Logging plugin for Microservices
 * - Logs to console
 * - Sends logs to Gateway
 * - Buffers logs if Gateway is unavailable
 */
async function loggerPlugin(fastify, options) {
  const config = fastify.config
  const serviceName = config.serviceName || 'unknown-service'
  
  // Get gateway configuration
  if (!config.services || !config.services.gateway) {
    console.warn('No gateway configuration found. Logs will only be displayed in console.')
  }
  
  const gatewayUrl = config.services && config.services.gateway ? config.services.gateway.url : null
  
  // Buffer to store logs if the gateway is unavailable
  let logBuffer = []
  const MAX_BUFFER_SIZE = 100
  
  // Function to send logs to the gateway
  const sendToGateway = async (level, message, meta = {}) => {
    console.log(`[${level.toUpperCase()}] ${message}`, meta)
    
    if (!gatewayUrl) return
    
    try {
      await axios.post(`${gatewayUrl}/logs`, { level, message, meta, service: serviceName, timestamp: new Date().toISOString() })
      
      // If there are logs in the buffer, try to send them
      if (logBuffer.length > 0) {
        const logs = [...logBuffer]
        logBuffer = []
        
        await axios.post(`${gatewayUrl}/logs/batch`, { logs, service: serviceName })
      }
    } catch (error) {
      // If it fails, store in buffer to retry later
      if (logBuffer.length < MAX_BUFFER_SIZE) {
        logBuffer.push({ level, message, meta, timestamp: new Date().toISOString() })
      }
    }
  }
  
  // Build the logger object
  const logger = {
    info:  (message, meta = {}) => sendToGateway('info',  message, meta),
    error: (message, meta = {}) => sendToGateway('error', message, meta),
    warn:  (message, meta = {}) => sendToGateway('warn',  message, meta),
    debug: (message, meta = {}) => sendToGateway('debug', message, meta),
    trace: (message, meta = {}) => sendToGateway('trace', message, meta),
    
    logstash: {
      info: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg)	sendToGateway('info', data.message, data)
        else													                        sendToGateway('info', msg || 'Info log', data)
      },
      error: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) sendToGateway('error', data.message, data)
        else                                                  sendToGateway('error', msg || 'Error log', data)
      },
      warn: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) sendToGateway('warn', data.message, data)
        else                                                  sendToGateway('warn', msg || 'Warning log', data)
      },
      debug: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) sendToGateway('debug', data.message, data)
        else                                                  sendToGateway('debug', msg || 'Debug log', data)
      }
    }
  }
  
  // When shutting down the server, try to send pending logs
  fastify.addHook('onClose', async (instance, done) => {
    if (logBuffer.length > 0 && gatewayUrl) {
      try {
        await axios.post(`${gatewayUrl}/logs/batch`, { logs: logBuffer, service: serviceName })
      } catch (error) {
        console.error(`Could not send ${logBuffer.length} pending logs when closing`)
      }
    }
    done()
  })
  
  fastify.decorate('logger', logger)
}

module.exports = fp(loggerPlugin, { name: 'logger' })
