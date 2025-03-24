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
  serviceName: process.env.SERVICE_NAME || 'gateway',
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

  // Logstash
  logstash: {
    host: process.env.LOGSTASH_HOST || 'logstash',
    port: process.env.LOGSTASH_PORT || 5044,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  
  // Rate limiting
  rateLimit: {
    max: process.env.RATE_LIMIT_MAX || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-auth-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
}

module.exports = config
