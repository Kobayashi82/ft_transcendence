"use strict";

const fp = require("fastify-plugin");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authenticator } = require("otplib");
const qrcode = require("qrcode");

async function authToolsPlugin(fastify, options) {
  // Configurar authenticator para TOTP
  authenticator.options = {
    window: fastify.config.twoFactor.window || 1,
    step: fastify.config.twoFactor.step || 30,
    digits: fastify.config.twoFactor.digits || 6,
  };

  // Decorar fastify con herramientas para autenticación
  fastify.decorate("authTools", {
    // Bcrypt para contraseñas (incrementado a 12 rounds por seguridad)
    async hashPassword(password, saltRounds = 12) {
      return await bcrypt.hash(password, saltRounds);
    },

    async comparePassword(password, hash) {
      return await bcrypt.compare(password, hash);
    },

    // Generar tokens aleatorios
    generateRandomToken(size = 32) {
      return crypto.randomBytes(size).toString("hex");
    },

    // Generar UUID
    generateUUID() {
      return crypto.randomUUID();
    },

    // TOTP para 2FA
    generateTOTPSecret() {
      return authenticator.generateSecret();
    },

    generateTOTPQRCode(secret, email) {
      const otpauth = authenticator.keyuri(
        email,
        fastify.config.twoFactor.issuer,
        secret
      );
      return qrcode.toDataURL(otpauth);
    },

    verifyTOTP(token, secret) {
      return authenticator.verify({ token, secret });
    },

    // Generar códigos de respaldo
    generateBackupCodes(count = 10) {
      const codes = [];
      for (let i = 0; i < count; i++) {
        // Generar código de 10 caracteres alfanuméricos
        const code = crypto.randomBytes(5).toString("hex").toUpperCase();
        // Formatear como XXXX-XXXX-XX
        codes.push(
          code.slice(0, 4) + "-" + code.slice(4, 8) + "-" + code.slice(8, 10)
        );
      }
      return codes;
    },

    // Generar token JWT con protección adicional
    generateJWT(user, expiresIn) {
      // Verificar que el usuario es válido
      if (!user || !user.id) {
        fastify.logger.error("Intento de generar JWT para usuario inválido", {
          user,
        });
        throw new Error("Usuario inválido para generar JWT");
      }

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
        exp: now + expiresInSeconds, // Fecha de expiración explícita
        jti: this.generateUUID(), // Identificador único para el token (permite revocación individual)
      };

      // Loggear la generación del token (sin datos sensibles)
      fastify.logger.info(`JWT generado para usuario ${user.id}`, {
        userId: user.id,
        exp: now + expiresInSeconds,
        jti: payload.jti,
      });

      // Firmar el token sin pasar opciones de expiración (ya las incluimos en el payload)
      return fastify.jwt.sign(payload);
    },

    // Generar token de refresco con mayor entropía
    generateRefreshToken() {
      return this.generateRandomToken(40);
    },

    // Crear objeto user_info para Redis con datos sanitizados
    createUserInfo(user) {
      // Sanitizar los datos del usuario antes de almacenarlos
      const sanitizeIfString = (value) => {
        return typeof value === "string"
          ? fastify.security.sanitizeInput(value)
          : value;
      };

      return {
        user_id: user.id,
        email: sanitizeIfString(user.email),
        username: sanitizeIfString(user.username),
        roles: Array.isArray(user.roles)
          ? user.roles.map(sanitizeIfString)
          : ["user"],
        has_2fa: !!user.has_2fa,
        account_type: sanitizeIfString(user.account_type),
        last_login: user.last_login || new Date().toISOString(),
        created_at: user.created_at,
        is_active: !!user.is_active,
      };
    },

    // Validar contraseña según política de seguridad
    validatePassword(password) {
      return fastify.security.validatePasswordStrength(password);
    },

    // Método para refrescar token desde una cookie
    async refreshTokenFromCookie(request, reply) {
      // Obtener el token de refresco de la cookie
      const refreshToken = request.cookies.refresh_token;

      if (!refreshToken) {
        throw new Error("No refresh token provided");
      }

      // Verificar el token de refresco
      const tokenData = await fastify.authDB.getRefreshToken(refreshToken);

      if (!tokenData || tokenData.revoked) {
        throw new Error("Invalid or revoked refresh token");
      }

      // Obtener el usuario
      const user = await fastify.authDB.getUserById(tokenData.user_id);

      if (!user || !user.is_active) {
        throw new Error("User not found or inactive");
      }

      // Revocar el token actual
      await fastify.authDB.revokeRefreshToken(refreshToken);

      // Generar nuevos tokens
      const accessToken = this.generateJWT(user);
      const newRefreshToken = this.generateRefreshToken();

      // Tiempos de expiración
      const refreshExpiresIn =
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800;
      const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 3600;

      // Almacenar el nuevo token de refresco
      await fastify.authDB.createRefreshToken(
        user.id,
        newRefreshToken,
        refreshExpiresIn,
        tokenData.device_id,
        tokenData.device_name,
        tokenData.device_type
      );

      // Establecer cookies
      reply.setCookie("session_active", "true", {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: refreshExpiresIn, // in seconds
        httpOnly: false, // Allow JavaScript to access this cookie
      });

      reply.setCookie("refresh_token", refreshToken, {
        path: "/api/auth",
        httpOnly: true, // Keep this secure
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: refreshExpiresIn,
      });
    },
  });

  fastify.logger.info(
    "Herramientas de autenticación inicializadas correctamente"
  );
}

module.exports = fp(authToolsPlugin, {
  name: "authTools",
  dependencies: ["jwt", "security"],
});
