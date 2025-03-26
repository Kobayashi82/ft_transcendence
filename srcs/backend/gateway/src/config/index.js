'use strict'

require('dotenv').config()
const services = require('./services')

// Get the current mode (development or production)
const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

// Generate encryption keys if not set in the environment (only in development mode)
let JWTSecret = process.env.JWT_SECRET;
if (!JWTSecret && env === 'production') {
  console.error('[ERROR] JWT_SECRET is required in production');
  process.exit(1);
}

const config = {

  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(':')[0]) || 'gateway',
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(':')[1]) || 3000,
  host: '0.0.0.0', isDev, env,
  
  // Log level
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  
  // Services
  services: services.services,
  routeMap: services.routeMap,
  
  // Redis
  redis: {
    host: (process.env.REDIS_URL && process.env.REDIS_URL.split(':')[0]) || 'redis',
    port: (process.env.REDIS_URL && process.env.REDIS_URL.split(':')[1]) || 6379,
    password: process.env.REDIS_PASSWORD, db: 0,
  },

  // Logstash
  logstash: {
    host: (process.env.LOGSTASH_URL && process.env.LOGSTASH_URL.split(':')[0]) || 'logstash',
    port: (process.env.LOGSTASH_URL && process.env.LOGSTASH_URL.split(':')[1]) || 5044,
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
    secret: JWTSecret || 'your_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
}

module.exports = config
