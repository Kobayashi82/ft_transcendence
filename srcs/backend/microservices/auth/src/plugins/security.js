'use strict'

const fp = require('fastify-plugin')
const crypto = require('crypto')
const axios = require('axios')
const CircuitBreaker = require('opossum')

async function securityPlugin(fastify, options) {
  // Configuración de Circuit Breaker
  const breakerOptions = {
    timeout: 10000, // 10 segundos
    errorThresholdPercentage: 50, // 50% de fallos para abrir el circuito
    resetTimeout: 30000, // 30 segundos para reintentar
    rollingCountTimeout: 60000, // Ventana de 60 segundos para calcular errores
    rollingCountBuckets: 10 // Dividir la ventana en 10 segmentos
  }
  
  // Función para crear un circuit breaker para peticiones HTTP
  const createHttpBreaker = (name) => {
    const breaker = new CircuitBreaker(async (config) => {
      return await axios(config)
    }, breakerOptions)
    
    // Eventos para logging
    breaker.on('open', () => {
      fastify.logger.warn(`Circuit breaker '${name}' abierto - deteniendo peticiones`)
    })
    
    breaker.on('halfOpen', () => {
      fastify.logger.info(`Circuit breaker '${name}' en estado semi-abierto - probando recuperación`)
    })
    
    breaker.on('close', () => {
      fastify.logger.info(`Circuit breaker '${name}' cerrado - servicio recuperado`)
    })
    
    breaker.on('fallback', (result) => {
      fastify.logger.warn(`Fallback para '${name}' ejecutado`)
    })
    
    return breaker
  }
  
  // Crear breakerrs para servicios externos
  const googleOAuthBreaker = createHttpBreaker('googleOAuth')
  const fortytwoOAuthBreaker = createHttpBreaker('42OAuth')
  
  // Funciones de cifrado para datos sensibles
  const encryptData = (text, key = fastify.config.encryption?.key) => {
    if (!key) {
      fastify.logger.warn('Llave de cifrado no configurada, usando modo inseguro')
      return text
    }
    
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return `${iv.toString('hex')}:${encrypted}`
    } catch (err) {
      fastify.logger.error(`Error al cifrar datos: ${err.message}`)
      throw new Error('Error de cifrado')
    }
  }
  
  const decryptData = (text, key = fastify.config.encryption?.key) => {
    if (!key) {
      fastify.logger.warn('Llave de cifrado no configurada, usando modo inseguro')
      return text
    }
    
    try {
      const [ivHex, encryptedHex] = text.split(':')
      const iv = Buffer.from(ivHex, 'hex')
      const encrypted = Buffer.from(encryptedHex, 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (err) {
      fastify.logger.error(`Error al descifrar datos: ${err.message}`)
      throw new Error('Error de descifrado')
    }
  }
  
  // Sistema de bloqueo de cuenta
  const isAccountLocked = async (email) => {
    const key = `account:locked:${email}`
    return await fastify.cache.exists(key) === 1
  }
  
  const lockAccount = async (email, durationSeconds = 300) => { // 5 minutos por defecto
    const key = `account:locked:${email}`
    await fastify.cache.set(key, 'locked', durationSeconds)
    fastify.logger.warn(`Cuenta bloqueada temporalmente: ${email}`, { email, duration: durationSeconds })
    return true
  }
  
  const unlockAccount = async (email) => {
    const key = `account:locked:${email}`
    await fastify.cache.del(key)
    fastify.logger.info(`Cuenta desbloqueada: ${email}`, { email })
    return true
  }
  
  const getFailedLoginAttempts = async (email) => {
    const key = `account:failed_attempts:${email}`
    return parseInt(await fastify.cache.get(key) || '0')
  }
  
  const incrementFailedLoginAttempts = async (email) => {
    const key = `account:failed_attempts:${email}`
    const attempts = await getFailedLoginAttempts(email)
    const newAttempts = attempts + 1
    
    // Almacenar con TTL de 30 minutos
    await fastify.cache.set(key, newAttempts.toString(), 1800)
    
    // Loggear el incremento
    fastify.logger.warn(`Intento de login fallido para ${email}. Intentos: ${newAttempts}`, { 
      email, attempts: newAttempts 
    })
    
    // Bloquear cuenta después de 5 intentos fallidos
    if (newAttempts >= 5) {
      await lockAccount(email)
      fastify.logger.warn(`Cuenta bloqueada por múltiples intentos fallidos: ${email}`, { 
        email, attempts: newAttempts 
      })
    }
    
    return newAttempts
  }
  
  const resetFailedLoginAttempts = async (email) => {
    const key = `account:failed_attempts:${email}`
    await fastify.cache.del(key)
    fastify.logger.info(`Reseteo de intentos fallidos para ${email}`, { email })
    return true
  }
  
  // Decorar fastify con utilidades de seguridad
  fastify.decorate('security', {
    // Circuit breakers
    breakers: {
      googleOAuth: googleOAuthBreaker,
      fortytwoOAuth: fortytwoOAuthBreaker
    },
    
    // Cifrado
    encrypt: encryptData,
    decrypt: decryptData,
    
    // Gestión de bloqueo de cuentas
    account: {
      isLocked: isAccountLocked,
      lock: lockAccount,
      unlock: unlockAccount,
      getFailedAttempts: getFailedLoginAttempts,
      incrementFailedAttempts: incrementFailedLoginAttempts,
      resetFailedAttempts: resetFailedLoginAttempts
    },
    
    // Validadores
    validatePasswordStrength: (password) => {
      // Verificar longitud
      if (password.length < 8) return { valid: false, reason: 'La contraseña debe tener al menos 8 caracteres' }
      
      // Verificar mayúsculas
      if (!/[A-Z]/.test(password)) return { valid: false, reason: 'La contraseña debe contener al menos una letra mayúscula' }
      
      // Verificar minúsculas
      if (!/[a-z]/.test(password)) return { valid: false, reason: 'La contraseña debe contener al menos una letra minúscula' }
      
      // Verificar números
      if (!/\d/.test(password)) return { valid: false, reason: 'La contraseña debe contener al menos un número' }
      
      // Verificar caracteres especiales
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, reason: 'La contraseña debe contener al menos un carácter especial' }
      }
      
      return { valid: true }
    },
    
    // Sanitizador básico para entrada de texto
    sanitizeInput: (input) => {
      if (typeof input !== 'string') return input
      
      // Eliminar caracteres potencialmente peligrosos para inyecciones
      return input
        .replace(/[<>]/g, '') // Eliminar < y > para prevenir HTML
        .replace(/javascript:/gi, '') // Prevenir javascript: URLs
        .replace(/on\w+=/gi, '') // Prevenir atributos onclick, onload, etc.
        .trim()
    }
  })
  
  fastify.logger.info('Módulo de seguridad inicializado correctamente')
}

module.exports = fp(securityPlugin, { name: 'security', dependencies: ['redis'] })