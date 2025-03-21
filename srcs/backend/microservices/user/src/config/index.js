'use strict'

require('dotenv').config()
const services = require('./services')

const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

// Check that JWT_SECRET exists
if (env === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in production');
  process.exit(1);
}

const config = {
  // Server
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
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
    db: 0, tls: null,
  },
 
  // Database
  database: {
    path: process.env.DB_PATH || './data/database.sqlite'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
}

module.exports = config
