'use strict'

require('dotenv').config()
const services = require('./services')
const crypto = require('crypto')

const env = process.env.NODE_ENV || 'development'
const isDev = env === 'development'

// Check that JWT_SECRET exists
if (env === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in production');
  process.exit(1);
}

// Generar una clave de cifrado para datos sensibles si no existe
let encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  if (env === 'production') {
    console.error('ENCRYPTION_KEY is required in production');
    process.exit(1);
  } else {
    // Generar una clave para desarrollo
    encryptionKey = crypto.randomBytes(32).toString('hex');
    console.warn('Using generated ENCRYPTION_KEY for development. In production, set this value in environment.');
  }
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
    // Si no se establece conexión después de 5 segundos, fallar rápido
    connectTimeout: 5000,
    // Número máximo de reintentos por solicitud
    maxRetriesPerRequest: 3
  },
 
  // Database
  database: {
    path: process.env.DB_PATH || './data/auth.sqlite',
    // Timeout para operaciones de base de datos (en ms)
    operationTimeout: parseInt(process.env.DB_TIMEOUT || '5000')
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
  
  // Encryption (para datos sensibles en la base de datos)
  encryption: {
    key: encryptionKey,
    algorithm: 'aes-256-cbc'
  },
  
  // Rate limiting
  rateLimit: {
    // Ventana de tiempo para login (en minutos)
    loginWindow: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '5'),
    // Número máximo de intentos por ventana
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
    // Ventana de tiempo para registro (en minutos)
    registerWindow: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW || '30'),
    // Número máximo de registros por ventana
    registerMax: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '3')
  },
  
  // Seguridad de contraseñas
  password: {
    // Factor de costo para bcrypt
    saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12'),
    // Número de intentos fallidos antes de bloquear
    maxFailedAttempts: parseInt(process.env.PASSWORD_MAX_FAILED_ATTEMPTS || '5'),
    // Duración del bloqueo (en segundos)
    lockDuration: parseInt(process.env.PASSWORD_LOCK_DURATION || '1800')
  }
}

module.exports = config