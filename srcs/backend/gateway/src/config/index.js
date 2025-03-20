'use strict'

require('dotenv').config()
const services = require('./services')

const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

const config = {
  // Configuración del servidor
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  isDev,
  env,
  
  // Nivel de log
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  
  // Servicios backend
  services: services.services,
  routeMap: services.routeMap,
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    tls: process.env.REDIS_TLS === 'true' ? {} : null,
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
  
  // JWT para autenticación (si se usa)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  
  // Métricas
  metrics: {
    endpoint: process.env.METRICS_ENDPOINT || '/metrics',
  },
}

module.exports = config