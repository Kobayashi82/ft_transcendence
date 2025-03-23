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
  port: process.env.PORT || 3001,
  host: '0.0.0.0',
  serviceName: process.env.SERVICE_NAME || 'auth',
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
    path: process.env.DB_PATH || './data/auth.sqlite'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-auth-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
 
  // OAuth
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: (process.env.GOOGLE_CLIENT_REDIRECT && process.env.GOOGLE_CLIENT_REDIRECT.trim()) || 'https://localhost/api/auth/oauth/google/callback',
    },
    fortytwo: {
      clientId: process.env.FORTYTWO_CLIENT_ID,
      clientSecret: process.env.FORTYTWO_CLIENT_SECRET,
      redirectUri: (process.env.FORTYTWO_CLIENT_REDIRECT && process.env.FORTYTWO_CLIENT_REDIRECT.trim()) || 'https://localhost/api/auth/oauth/42/callback',
    }
  },

  // 2FA
  twoFactor: {
    issuer: process.env.TOTP_ISSUER || 'PongApp',
    window: parseInt(process.env.TOTP_WINDOW || '1'),
    step: parseInt(process.env.TOTP_STEP || '30'),
    digits: parseInt(process.env.TOTP_DIGITS || '6')
  },
}

module.exports = config
