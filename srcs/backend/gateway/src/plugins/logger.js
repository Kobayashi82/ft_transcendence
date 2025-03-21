'use strict'

const fp = require('fastify-plugin')
const winston = require('winston')
const net = require('net')

/**
 * Logging plugin for the Gateway
 * - Logs to console with nice formatting
 * - Sends logs to Logstash if available
 * - Provides endpoints to receive logs from microservices
 */
async function loggerPlugin(fastify, options) {
  const config = fastify.config
  const serviceName = config.serviceName || 'gateway'
  
  // Configure Winston
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${meta.service || serviceName}] ${level}: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`
      })
    )
  })
  
  // Create Winston logger
  const winstonLogger = winston.createLogger({ level: config.logLevel || 'info', transports: [consoleTransport] })
  
  // Configure direct TCP connection to Logstash
  let logstashClient = null
  let logstashConnected = false
  
  // Connect to Logstash if not in dev mode (!config.isDev)
  if (config.isDev) {
    const host = process.env.LOGSTASH_HOST || 'logstash'
    const port = parseInt(process.env.LOGSTASH_PORT || '5044')
    
    try {
      logstashClient = new net.Socket()
      
      logstashClient.on('connect', () => {
        logstashConnected = true
        console.log(`Logstash connected on port ${port}`)
      })
            
      logstashClient.on('close', () => {
        logstashConnected = false
        setTimeout(() => { logstashClient.connect(port, host) }, 5000)
      })
      
      logstashClient.on('error', (err) => { logstashConnected = false })

      logstashClient.connect(port, host)
    } catch (err) {}
  }
  
  // Function to send logs to Logstash
  const sendToLogstash = (level, message, meta = {}) => {
    if (!logstashConnected || !logstashClient) return
    
    try {
      const logData = {
        '@timestamp': new Date().toISOString(),
        service: meta.service || serviceName,
        env: config.env || 'production',
        host: meta.host || config.host || 'gateway',
        level, message, ...meta
      }
     
      // Send to Logstash
      const logString = JSON.stringify(logData) + '\n'
      logstashClient.write(logString)
    } catch (err) {}
  }
  
  // Unified logging function (console & Logstash)
  const log = (level, message, meta = {}) => {
    winstonLogger.log(level, message, meta)
    if (config.isDev && logstashConnected) { sendToLogstash(level, message, meta) }
  }
  
  // Construct the logger object
  const logger = {
    info:  (message, meta = {}) => log('info',  message, meta),
    error: (message, meta = {}) => log('error', message, meta),
    warn:  (message, meta = {}) => log('warn',  message, meta),
    debug: (message, meta = {}) => log('debug', message, meta),
    trace: (message, meta = {}) => log('trace', message, meta),
    
    logstash: {
      info: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) log('info', data.message, data)
        else                                                  log('info', msg || 'Info log', data)
      },
      error: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) log('error', data.message, data)
        else                                                  log('error', msg || 'Error log', data)
      },
      warn: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) log('warn', data.message, data)
        else                                                  log('warn', msg || 'Warning log', data)
      },
      debug: (data, msg) => {
        if (typeof data === 'object' && data.message && !msg) log('debug', data.message, data)
        else                                                  log('debug', msg || 'Debug log', data)
      }
    }
  }
  
  // Register endpoints to receive logs from microservices
  fastify.post('/internal/logs', async (request, reply) => {
    const { level, message, meta = {}, service, timestamp } = request.body
    log(level, message, { ...meta, service, timestamp })
    return { success: true }
  })
  
  fastify.post('/internal/logs/batch', async (request, reply) => {
    const { logs, service } = request.body
    
    if (Array.isArray(logs)) {
      for (const entry of logs) {
        log(entry.level, entry.message, { ...entry.meta, service: entry.service || service,timestamp: entry.timestamp })
      }
    }
    
    return { success: true, count: logs.length }
  })
  
  fastify.decorate('logger', logger)
}

module.exports = fp(loggerPlugin, { name: 'logger' })
