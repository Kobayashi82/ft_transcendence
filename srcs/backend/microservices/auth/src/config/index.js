'use strict'

require('dotenv').config()

const services = require('./services')
const crypto = require('crypto')

// Get the current mode (development or production)
const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

// Generate encryption keys if not set in the environment (only in development mode)
let encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  if (env === 'production') {
    console.log('[ERROR] ENCRYPTION_KEY is required in production');
    process.exit(1);
  } else {
    encryptionKey = crypto.randomBytes(32).toString('hex');
    console.warn('[WARN] Using generated ENCRYPTION_KEY for development. In production, set this value in the environment');
  }
}
let JWTSecret = process.env.JWT_SECRET;
if (!JWTSecret) {
  if (env === 'production') {
    console.error('[ERROR] JWT_SECRET is required in production');
    process.exit(1);
  } else {
    JWTSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[WARN] Using generated JWT_SECRET for development. In production, set this value in the environment');
  }
}

const config = {

  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(':')[0]) || 'auth',
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(':')[1]) || 3000,
  host: '0.0.0.0', isDev, env,
  
  // Log level
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  
  // Services
  services: services.services,

  // Redis
  redis: {
    host: (process.env.REDIS_URL && process.env.REDIS_URL.split(':')[0]) || 'redis',
    port: (process.env.REDIS_URL && process.env.REDIS_URL.split(':')[1]) || 6379,
    password: process.env.REDIS_PASSWORD, db: 0,
  },
 
  // SQLite
  database: {
    path: './data/auth.sqlite',
    operationTimeout: 5000
  },
  encryption: {
    key: encryptionKey,
    algorithm: 'aes-256-cbc'
  },

  // JWT & Cookies
  jwt: {
    secret: JWTSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    options: {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE) || parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800
    }
  },

  // OAuth (Google & 42)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CLIENT_REDIRECT,
    },
    fortytwo: {
      clientId: process.env.FORTYTWO_CLIENT_ID,
      clientSecret: process.env.FORTYTWO_CLIENT_SECRET,
      redirectUri: process.env.FORTYTWO_CLIENT_REDIRECT,
    }
  },

  // 2FA
  twoFactor: {
    issuer: process.env.TOTP_ISSUER || 'ft_transcendence',
    window: parseInt(process.env.TOTP_WINDOW || '1'),
    step: parseInt(process.env.TOTP_STEP || '30'),
    digits: parseInt(process.env.TOTP_DIGITS || '6')
  },
  
  // Passwords
  password: {
    saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12'),
    maxFailedAttempts: parseInt(process.env.PASSWORD_MAX_FAILED_ATTEMPTS || '5'),
    lockDuration: parseInt(process.env.PASSWORD_LOCK_DURATION || '1800')
  }
}

module.exports = config
