'use strict'

const fp = require('fastify-plugin')

async function dataRetentionPlugin(fastify, options) {
  // Tareas periódicas de limpieza de datos
  const cleanupTasks = {
    // Limpiar tokens de refresco expirados
    async cleanExpiredRefreshTokens() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM refresh_tokens WHERE expires_at < datetime("now") AND revoked = false',
          [],
          'refresh_tokens'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Limpieza: ${result.changes} tokens de refresco expirados eliminados`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error al limpiar tokens de refresco: ${err.message}`)
        return 0
      }
    },
    
    // Limpiar tokens de reseteo de contraseña expirados
    async cleanExpiredResetTokens() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM password_reset WHERE expires_at < datetime("now")',
          [],
          'password_reset'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Limpieza: ${result.changes} tokens de reseteo expirados eliminados`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error al limpiar tokens de reseteo: ${err.message}`)
        return 0
      }
    },
    
    // Limpiar sesiones expiradas
    async cleanExpiredSessions() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM sessions WHERE expires_at < datetime("now")',
          [],
          'sessions'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Limpieza: ${result.changes} sesiones expiradas eliminadas`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error al limpiar sesiones: ${err.message}`)
        return 0
      }
    },
    
    // Anonimizar usuarios eliminados (después de un período de retención)
    async anonymizeDeletedUsers(retentionDays = 90) {
      try {
        // Usuarios eliminados hace más de X días
        const result = await fastify.db.update(
          `UPDATE users 
           SET email = 'deleted_' || id || '@example.com', 
               username = 'deleted_user_' || id,
               password_hash = NULL,
               salt = NULL,
               oauth_id = NULL,
               is_anonymized = TRUE
           WHERE is_deleted = TRUE 
           AND updated_at < datetime('now', '-${retentionDays} days')
           AND is_anonymized IS NOT TRUE`,
          [],
          'users'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Limpieza: ${result.changes} usuarios eliminados anonimizados`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error al anonimizar usuarios: ${err.message}`)
        return 0
      }
    }
  }
  
  // Ejecutar limpieza periódica (cada 24 horas)
  const runCleanupTasks = async () => {
    fastify.logger.info('Iniciando tareas de limpieza y retención de datos')
    
    await cleanupTasks.cleanExpiredRefreshTokens()
    await cleanupTasks.cleanExpiredResetTokens()
    await cleanupTasks.cleanExpiredSessions()
    await cleanupTasks.anonymizeDeletedUsers()
    
    fastify.logger.info('Tareas de limpieza completadas')
  }
  
  // Ejecutar inmediatamente al inicio
  runCleanupTasks()
  
  // Programar ejecución periódica
  const interval = setInterval(runCleanupTasks, 24 * 60 * 60 * 1000) // 24 horas
  
  // Decorar fastify con funciones de limpieza (para uso manual o tests)
  fastify.decorate('dataRetention', {
    ...cleanupTasks,
    runCleanup: runCleanupTasks
  })
  
  // Limpiar al cerrar
  fastify.addHook('onClose', (instance, done) => {
    clearInterval(interval)
    done()
  })
  
  fastify.logger.info('Plugin de retención de datos inicializado')
}

module.exports = fp(dataRetentionPlugin, { name: 'dataRetention', dependencies: ['db'] })