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
  
  // Get gateway configuration
  if (!config.services.gateway.url) {
    console.warn(new Date().toISOString(), '[WARN] No gateway configuration found. Logs will only be displayed in console')
  }
    
  // Buffer to store logs if gateway is unavailable
  let logBuffer = []
  const MAX_BUFFER_SIZE = 100

  // Send logs to console
  const sendToConsole = async (level, message, meta = {}) => {
    if (Object.keys(meta).length > 0) {
      console.log(new Date().toISOString(), `${level.toUpperCase()}] ${message}`, meta)
    } else {
      console.log(new Date().toISOString(), `${level.toUpperCase()} ${message}`)
    }
  }

  // Send logs to gateway
  const sendToGateway = async (level, message, meta = {}) => {
    
    sendToConsole(level, message, meta)
    if (!config.services.gateway.url) return   

    try {
      await axios.post(`${config.services.gateway.url}/logs`, 
        { level, message, meta, service: config.serviceName, timestamp: new Date().toISOString() },
        { timeout: config.services.gateway.timeout }
      )

      // If there are logs in the buffer, try to send them
      if (logBuffer.length > 0) {
        const logs = [...logBuffer]
        logBuffer = []
        
        await axios.post(`${config.services.gateway.url}/logs/batch`,
          { logs, service: config.serviceName },
          { timeout: config.services.gateway.timeout }
        )
      }
    } catch (error) {
      // If it fails, store in buffer to retry later
      if (logBuffer.length < MAX_BUFFER_SIZE) {
        logBuffer.push({ level, message, meta, timestamp: new Date().toISOString() })
      }
    }
  }

  // Logger for gateway
  const logger = {
    info:  (message, meta = {}) => sendToGateway('info',  message, meta),
    error: (message, meta = {}) => sendToGateway('error', message, meta),
    warn:  (message, meta = {}) => sendToGateway('warn',  message, meta),
    debug: (message, meta = {}) => sendToGateway('debug', message, meta),
    trace: (message, meta = {}) => sendToGateway('trace', message, meta),
  }

  // Logger for local
  const logger_local = {
    info:  (message, meta = {}) => sendToConsole('info',  message, meta),
    error: (message, meta = {}) => sendToConsole('error', message, meta),
    warn:  (message, meta = {}) => sendToConsole('warn',  message, meta),
    debug: (message, meta = {}) => sendToConsole('debug', message, meta),
    trace: (message, meta = {}) => sendToConsole('trace', message, meta),
  }
  
  // When shutting down the server, try to send pending logs
  fastify.addHook('onClose', async (instance, done) => {
    if (logBuffer.length > 0 && gatewayUrl) {
      try {
        await axios.post(`${gatewayUrl}/logs/batch`, { logs: logBuffer, service: config.serviceName })
      } catch (error) {
        logger_local.error(`Could not send ${logBuffer.length} pending logs when closing`)
      }
    }
    done()
  })
  
  fastify.decorate('logger', logger)
  fastify.decorate('logger_local', logger_local)
}

module.exports = fp(loggerPlugin, { name: 'logger' })
