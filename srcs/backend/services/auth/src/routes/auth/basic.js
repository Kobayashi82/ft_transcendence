"use strict";

const { loginSchema } = require("../../schemas/basic");

async function loginRoutes(fastify, options) {
  // Función para invalidar la caché de un usuario
  async function invalidateUserCache(userId) {
    try {
      // Obtener todas las claves relacionadas con este usuario
      const userKeys = await fastify.redis.smembers(`auth:${userId}:keys`);

      if (userKeys && userKeys.length > 0) {
        // Eliminar todas las claves de caché
        await fastify.redis.del(...userKeys);
        // Eliminar el conjunto de claves
        await fastify.redis.del(`auth:${userId}:keys`);

        fastify.logger.debug(`Caché invalidada para usuario ID: ${userId}`);
      }
    } catch (err) {
      fastify.logger.error(`Error al invalidar caché: ${err.message}`, {
        userId,
      });
    }
  }

  fastify.post("/login", { schema: loginSchema }, async (request, reply) => {
    try {
      const { email, username, password, device_info } = request.body;

      let user = null;
      let cacheKey = null;
      let identifier = null;

      // Determinar qué identificador se proporcionó
      if (email) {
        identifier = email;
        cacheKey = `auth:email:${email}`;
      } else if (username) {
        identifier = username;
        cacheKey = `auth:username:${username}`;
      } else {
        // Esto no debería ocurrir debido a la validación del schema
        reply.code(400).send({
          error: "Datos inválidos",
          message: "Se requiere email o nombre de usuario",
        });
        return;
      }

      // 1. Intentar obtener el usuario desde Redis
      try {
        const cachedUser = await fastify.redis.get(cacheKey);
        if (cachedUser) {
          user = JSON.parse(cachedUser);
          fastify.logger.debug(`Usuario recuperado de caché: ${cacheKey}`);
        }
      } catch (redisErr) {
        fastify.logger.error(`Error accediendo a Redis: ${redisErr.message}`);
      }

      // 2. Si no está en caché, obtenerlo de la base de datos
      if (!user) {
        if (email) {
          user = await fastify.authDB.getUserByEmail(email);
        } else {
          user = await fastify.authDB.getUserByUsername(username);
        }
      }

      // 3. Si se encontró el usuario, almacenarlo en Redis
      if (user) {
        try {
          // Almacenar en caché con TTL (30 minutos)
          await fastify.redis.set(cacheKey, JSON.stringify(user), "EX", 1800);

          // También almacenar referencia cruzada para invalidación fácil
          const userIdKey = `auth:id:${user.id}`;
          await fastify.redis.set(userIdKey, JSON.stringify(user), "EX", 1800);

          // Almacenar mapeo de claves para invalidación fácil cuando el usuario cambie
          await fastify.redis.sadd(`auth:${user.id}:keys`, cacheKey, userIdKey);

          fastify.logger.debug(`Usuario almacenado en caché: ${cacheKey}`);
        } catch (redisErr) {
          fastify.logger.error(`Error guardando en Redis: ${redisErr.message}`);
        }
      }

      // 4. Verificar si la cuenta está bloqueada
      if (user && (await fastify.security.account.isLocked(user.email))) {
        fastify.logger.warn(
          `Intento de login a cuenta bloqueada: ${user.email}`,
          {
            ip: request.ip,
            identifier: identifier,
          }
        );

        reply.code(401).send({
          error: "Cuenta bloqueada",
          message:
            "La cuenta está temporalmente bloqueada por múltiples intentos fallidos. Intente más tarde o restablezca su contraseña.",
        });
        return;
      }

      // 5. Verificar que el usuario existe y es de tipo local
      if (!user || user.account_type !== "local") {
        const emailToLock = email || (user ? user.email : null);
        if (emailToLock) {
          await fastify.security.account.incrementFailedAttempts(emailToLock);
        }

        fastify.logger.warn(`Intento de login con credenciales inválidas`, {
          ip: request.ip,
          identifier: identifier,
        });

        reply.code(401).send({
          error: "No autorizado",
          message: "Credenciales inválidas",
        });
        return;
      }

      // 6. Verificar contraseña
      const passwordValid = await fastify.authTools.comparePassword(
        password,
        user.password_hash
      );

      if (!passwordValid) {
        // Incrementar contador de intentos fallidos
        await fastify.security.account.incrementFailedAttempts(user.email);

        fastify.logger.warn(
          `Intento de login con contraseña incorrecta: ${user.email}`,
          {
            ip: request.ip,
            userId: user.id,
            email: user.email,
          }
        );

        reply.code(401).send({
          error: "No autorizado",
          message: "Credenciales inválidas",
        });
        return;
      }

      // 7. Resetear contador de intentos fallidos
      await fastify.security.account.resetFailedAttempts(user.email);

      // 8. Verificar si el usuario está activo
      if (!user.is_active) {
        fastify.logger.warn(
          `Intento de login a cuenta inactiva: ${user.email}`,
          {
            ip: request.ip,
            userId: user.id,
            email: user.email,
          }
        );

        reply.code(401).send({
          error: "No autorizado",
          message: "La cuenta está desactivada",
        });
        return;
      }

      // 9. Si el usuario tiene 2FA, generar un token temporal y pedir verificación
      if (user.has_2fa) {
        // Generar token temporal (válido por 5 minutos)
        const tempToken = fastify.jwt.sign({
          sub: user.id,
          email: user.email,
          temp: true,
          exp: Math.floor(Date.now() / 1000) + 300, // 5 minutos
        });

        fastify.logger.info(
          `Solicitud de verificación 2FA para usuario: ${user.id}`,
          {
            userId: user.id,
            email: user.email,
            ip: request.ip,
          }
        );

        reply.code(200).send({
          requires_2fa: true,
          temp_token: tempToken,
          message: "Se requiere verificación de dos factores",
        });
        return;
      }

      // 10. Extraer información del dispositivo
      const deviceId = device_info?.id || fastify.authTools.generateUUID();
      const deviceName =
        device_info?.name || request.headers["user-agent"] || "Unknown Device";
      const deviceType = device_info?.type || "browser";

      // 11. Actualizar último login
      await fastify.authDB.updateLastLogin(user.id);

      // 12. Generar tokens
      const accessToken = fastify.authTools.generateJWT(user);
      const refreshToken = fastify.authTools.generateRefreshToken();

      // 13. Configurar tiempos de expiración
      const refreshExpiresIn =
        parseInt(fastify.config.jwt.refreshExpiresIn) || 604800; // 7 días por defecto
      const accessExpiresIn = parseInt(fastify.config.jwt.expiresIn) || 3600; // 1 hora por defecto

      // 14. Almacenar token de refresco
      await fastify.authDB.createRefreshToken(
        user.id,
        refreshToken,
        refreshExpiresIn,
        deviceId,
        deviceName,
        deviceType
      );

      // 15. Registrar sesión
      await fastify.authDB.createSession(
        user.id,
        fastify.authTools.generateUUID(),
        request.ip,
        deviceName,
        refreshExpiresIn,
        deviceId
      );

      // 16. Crear y almacenar información de usuario en Redis para acceso rápido
      const userInfo = fastify.authTools.createUserInfo(user);
      const userInfoCacheKey = `auth:${user.id}:info`;

      try {
        await fastify.redis.set(
          userInfoCacheKey,
          JSON.stringify(userInfo),
          "EX",
          1800
        ); // 30 minutos
        await fastify.redis.sadd(`auth:${user.id}:keys`, userInfoCacheKey);
      } catch (redisErr) {
        fastify.logger.error(
          `Error guardando info de usuario en Redis: ${redisErr.message}`
        );
      }

      fastify.logger.info(`Login exitoso para usuario: ${user.id}`, {
        userId: user.id,
        email: user.email,
        ip: request.ip,
        deviceId: deviceId,
      });

      // 17. Establecer cookies
      reply
        .setCookie("refresh_token", refreshToken, {
          path: "/api/auth",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: refreshExpiresIn, // en segundos
        })
        // Establecer la cookie de sesión activa
        .setCookie("session_active", "true", {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: refreshExpiresIn,
        });

      // 18. Responder con tokens y datos de usuario
      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken, // Incluir también en la respuesta
        expires_in: accessExpiresIn,
        token_type: "Bearer",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          has_2fa: user.has_2fa,
        },
      });
    } catch (err) {
      fastify.logger.error(`Error en login: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        path: request.url,
      });

      reply.code(500).send({
        error: "Error interno",
        message: "Error al iniciar sesión",
      });
    }
  });
}

module.exports = loginRoutes;
