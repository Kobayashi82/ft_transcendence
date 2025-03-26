'use strict'

const fp = require('fastify-plugin')

async function jwtPlugin(fastify, options) {

  await fastify.register(require('@fastify/jwt'), {
    secret: fastify.config.jwt.secret,
    sign: {
      expiresIn: fastify.config.jwt.expiresIn
    }
  })
  
  fastify.decorate('verifyJWT', async (request, reply) => {
    try {
      await request.jwtVerify()
      
      // Verificar si el token está en la lista negra
      const token = request.headers.authorization?.split(' ')[1]
      if (token && await fastify.isBlacklisted(token)) {
        // Registrar operación de token rechazado
        if (fastify.metrics && fastify.metrics.auth) {
          fastify.metrics.auth.recordTokenOperation('rejected', 'jwt')
          fastify.metrics.auth.recordSecurityEvent('blacklisted_token', 'blocked')
        }
        throw new Error('Token revocado')
      }
      
      // Registrar validación exitosa de token
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('validated', 'jwt')
      }
      
      // Verificar si el usuario está activo
      const userId = request.user.sub
      const userKey = `user:${userId}:info`
      
      // Intentar obtener de caché
      let user = await fastify.cache.get(userKey)
      
      // Si no está en caché, obtener de la base de datos
      if (!user) {
        user = await fastify.authDB.getUserById(userId)
        
        if (user) {
          // Almacenar en caché
          const userInfo = fastify.authTools.createUserInfo(user)
          await fastify.cache.set(userKey, userInfo, 1800) // 30 minutos
        }
      }
      
      // Verificar si el usuario existe y está activo
      if (!user || !user.is_active) {
        fastify.logger.warn(`Intento de acceso con token de usuario inactivo: ${userId}`, {
          userId,
          path: request.url,
          method: request.method,
          ip: request.ip
        })
        
        throw new Error('Usuario inactivo o no encontrado')
      }
      
      // Loggear acceso exitoso para auditoría
      fastify.logger.debug(`Acceso verificado para usuario ${userId}: ${request.method} ${request.url}`, {
        userId,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
    } catch (err) {
      // Registrar fallo de validación de token
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('validation_failed', 'jwt')
      }
      
      // Si falla la verificación JWT, intentar refrescar el token usando la cookie
      if (!request.headers.authorization && request.cookies.refresh_token) {
        try {
          const refreshToken = request.cookies.refresh_token;
          
          // Verificar el token de refresco
          const tokenData = await fastify.authDB.getRefreshToken(refreshToken);
          
          if (tokenData && !tokenData.revoked) {
            // Obtener el usuario
            const user = await fastify.authDB.getUserById(tokenData.user_id);
            
            if (user && user.is_active) {
              // Generar un nuevo token de acceso
              const newAccessToken = fastify.authTools.generateJWT(user);
              // Registrar emisión de nuevo token JWT
              if (fastify.metrics && fastify.metrics.auth) {
                fastify.metrics.auth.recordTokenOperation('issued', 'jwt')
              }
              
              // Generar un nuevo token de refresco
              const newRefreshToken = fastify.authTools.generateRefreshToken();
              const refreshExpiresIn = parseInt(fastify.config.jwt.refreshExpiresIn) || 604800;
              
              // Almacenar el nuevo token de refresco
              await fastify.authDB.createRefreshToken(
                user.id, 
                newRefreshToken, 
                refreshExpiresIn,
                tokenData.device_id,
                tokenData.device_name,
                tokenData.device_type
              );
              
              // Registrar emisión de nuevo token de refresco
              if (fastify.metrics && fastify.metrics.auth) {
                fastify.metrics.auth.recordTokenOperation('issued', 'refresh')
              }
              
              // Revocar el token antiguo
              await fastify.authDB.revokeRefreshToken(refreshToken);
              
              // Registrar revocación del token de refresco
              if (fastify.metrics && fastify.metrics.auth) {
                fastify.metrics.auth.recordTokenOperation('revoked', 'refresh')
              }
              
              // Establecer cookies
              reply
                .setCookie('refresh_token', newRefreshToken, {
                  path: '/api/auth',
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: refreshExpiresIn
                })
                .setCookie('session_active', 'true', {
                  path: '/',
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: refreshExpiresIn
                });
              
              // Establecer el token en el objeto de solicitud para que pueda continuar
              request.user = fastify.jwt.decode(newAccessToken);
              
              // Continuar con la solicitud
              return true;
            }
          }
        } catch (refreshErr) {
          fastify.logger.error(`Error al refrescar token desde cookie: ${refreshErr.message}`, {
            error: refreshErr.message,
            path: request.url,
            method: request.method,
            ip: request.ip
          });
          // Continuar con el flujo normal de error
        }
      }
      
      fastify.logger.warn(`Verificación JWT fallida: ${err.message}`, {
        error: err.message,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
      reply.code(401).send({
        error: 'No autorizado',
        message: err.message
      })
      return false
    }
    return true
  })
  
  // Verificar si un token está en la lista negra (Redis)
  fastify.decorate('isBlacklisted', async (token) => {
    try {
      const blacklisted = await fastify.cache.exists(`blacklist:${token}`)
      return blacklisted === 1
    } catch (err) {
      fastify.logger.error(`Error al verificar token en lista negra: ${err.message}`, {
        error: err.message
      })
      // En caso de error, permitir el acceso (más seguro permitir y loggear que bloquear incorrectamente)
      return false
    }
  })
  
  // Revocar un token específico
  fastify.decorate('revokeToken', async (token, expiresIn = null) => {
    try {
      // Decodificar el token para obtener su expiración
      const decoded = fastify.jwt.decode(token)
      
      // Si se proporciona expiresIn, usar ese valor
      // Si no, calcular basado en la expiración del token
      const ttl = expiresIn || (decoded && decoded.exp 
        ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) 
        : 3600) // 1 hora por defecto
      
      // Añadir a la lista negra
      await fastify.cache.set(`blacklist:${token}`, '1', ttl)
      
      // Registrar revocación de token
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('revoked', 'jwt')
      }
      
      fastify.logger.info(`Token revocado exitosamente`, {
        jti: decoded?.jti,
        userId: decoded?.sub,
        ttl
      })
      
      return true
    } catch (err) {
      // Registrar fallo de revocación
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('revoke_failed', 'jwt')
      }
      
      fastify.logger.error(`Error al revocar token: ${err.message}`, {
        error: err.message
      })
      throw err
    }
  })
  
  // Hooks para verificar token en todas las rutas, excepto las públicas
  fastify.addHook('onRequest', async (request, reply) => {
    // Rutas públicas que no requieren autenticación
    const publicRoutes = [
      '/login',
      '/register',
      '/oauth',
      '/password/reset',
      '/password/reset-request',
      '/health',
      '/metrics',
      '/'  // Ruta raíz (info del servicio)
    ]
    
    // Extraer la ruta de la solicitud sin los parámetros de consulta
    const requestPath = request.url.split('?')[0]
    
    // Si la ruta es pública, continuar
    let isPublic = false;
    for (const route of publicRoutes) {
      if (requestPath.startsWith(route)) {
        isPublic = true;
        break;
      }
    }
    
    if (isPublic) {
      return;
    }
    
    // Verificar JWT
    try {
      await request.jwtVerify()
      
      // Verificar si el token está en la lista negra
      const token = request.headers.authorization?.split(' ')[1]
      if (token && await fastify.isBlacklisted(token)) {
        // Registrar token bloqueado
        if (fastify.metrics && fastify.metrics.auth) {
          fastify.metrics.auth.recordTokenOperation('rejected', 'jwt')
          fastify.metrics.auth.recordSecurityEvent('blacklisted_token', 'blocked')
        }
        throw new Error('Token revocado')
      }
      
      // Registrar validación exitosa
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('validated', 'jwt')
      }
    } catch (err) {
      // Registrar fallo de validación
      if (fastify.metrics && fastify.metrics.auth) {
        fastify.metrics.auth.recordTokenOperation('validation_failed', 'jwt')
      }
      
      fastify.logger.warn(`Acceso denegado a ruta protegida: ${request.url}`, {
        error: err.message,
        path: request.url,
        method: request.method,
        ip: request.ip
      })
      
      reply.code(401).send({ 
        error: 'No autorizado', 
        message: err.message 
      })
      return reply
    }
  })
  
  fastify.logger.info('JWT plugin configurado correctamente')
}

module.exports = fp(jwtPlugin, { name: 'jwt', dependencies: ['redis'] })