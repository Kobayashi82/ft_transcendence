'use strict'

const fp = require('fastify-plugin')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { authenticator } = require('otplib')
const qrcode = require('qrcode')

async function authToolsPlugin(fastify, options) {
  // Configurar authenticator para TOTP
  authenticator.options = {
    window: fastify.config.twoFactor.window || 1,
    step: fastify.config.twoFactor.step || 30,
    digits: fastify.config.twoFactor.digits || 6
  }
  
  // Decorar fastify con herramientas para autenticación
  fastify.decorate('authTools', {
    // Bcrypt para contraseñas
    async hashPassword(password, saltRounds = 10) {
      return await bcrypt.hash(password, saltRounds)
    },
    
    async comparePassword(password, hash) {
      return await bcrypt.compare(password, hash)
    },
    
    // Generar tokens aleatorios
    generateRandomToken(size = 32) {
      return crypto.randomBytes(size).toString('hex')
    },
    
    // Generar UUID
    generateUUID() {
      return crypto.randomUUID()
    },
    
    // TOTP para 2FA
    generateTOTPSecret() {
      return authenticator.generateSecret()
    },
    
    generateTOTPQRCode(secret, email) {
      const otpauth = authenticator.keyuri(email, fastify.config.twoFactor.issuer, secret)
      return qrcode.toDataURL(otpauth)
    },
    
    verifyTOTP(token, secret) {
      return authenticator.verify({ token, secret })
    },
    
    // Generar códigos de respaldo
    generateBackupCodes(count = 10) {
      const codes = []
      for (let i = 0; i < count; i++) {
        // Generar código de 10 caracteres alfanuméricos
        const code = crypto.randomBytes(5).toString('hex').toUpperCase()
        // Formatear como XXXX-XXXX-XX
        codes.push(code.slice(0, 4) + '-' + code.slice(4, 8) + '-' + code.slice(8, 10))
      }
      return codes
    },
    
    // Generar token JWT - VERSIÓN CORREGIDA
    generateJWT(user, expiresIn) {
      // Calcular timestamp actual
      const now = Math.floor(Date.now() / 1000);
      
      // Asegurar que expiresIn es un número
      let expiresInSeconds;
      if (expiresIn) {
        expiresInSeconds = parseInt(expiresIn, 10);
      } else if (fastify.config.jwt.expiresIn) {
        expiresInSeconds = parseInt(fastify.config.jwt.expiresIn, 10);
      } else {
        expiresInSeconds = 900; // Valor predeterminado: 15 minutos
      }
      
      // Crear el payload incluyendo iat y exp explícitamente
      const payload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
        has_2fa: user.has_2fa,
        account_type: user.account_type,
        iat: now,
        exp: now + expiresInSeconds // Fecha de expiración explícita
      }
      
      // Firmar el token sin pasar opciones de expiración (ya las incluimos en el payload)
      return fastify.jwt.sign(payload)
    },
    
    // Generar token de refresco
    generateRefreshToken() {
      return this.generateRandomToken(40)
    },
    
    // Crear objeto user_info para Redis
    createUserInfo(user) {
      return {
        user_id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles || ['user'],
        has_2fa: !!user.has_2fa,
        account_type: user.account_type,
        last_login: user.last_login || new Date().toISOString(),
        created_at: user.created_at,
        is_active: !!user.is_active
      }
    }
  })
}

module.exports = fp(authToolsPlugin, { name: 'authTools', dependencies: ['jwt'] })