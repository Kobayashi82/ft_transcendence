'use strict'

require('dotenv').config()
const services = require('./services')

const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

const config = {
  // Server
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  serviceName: process.env.SERVICE_NAME || 'user',
  isDev, env,
  
  // Log level
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  
  // Services
  services: services.services,
  routeMap: services.routeMap,

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 1,
    tls: process.env.REDIS_TLS === 'true' ? {} : null,
  },
 
  // Database
  database: {
    path: process.env.DB_PATH || './data/database.sqlite'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  
  // Metrics
  metrics: {
    endpoint: process.env.METRICS_ENDPOINT || '/metrics',
  },
}

module.exports = config
