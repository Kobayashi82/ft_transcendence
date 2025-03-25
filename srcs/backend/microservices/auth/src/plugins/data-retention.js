'use strict'

const fp = require('fastify-plugin')

async function dataRetentionPlugin(fastify, options) {
  // Periodic data cleanup tasks
  const cleanupTasks = {
    // Remove expired refresh tokens
    async cleanExpiredRefreshTokens() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM refresh_tokens WHERE expires_at < datetime(\'now\') AND revoked = false',
          [],
          'refresh_tokens'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Cleanup: ${result.changes} expired refresh tokens removed`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error cleaning refresh tokens: ${err.message}`)
        return 0
      }
    },
    
    // Remove expired password reset tokens
    async cleanExpiredResetTokens() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM password_reset WHERE expires_at < datetime(\'now\')',
          [],
          'password_reset'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Cleanup: ${result.changes} expired reset tokens removed`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error cleaning reset tokens: ${err.message}`)
        return 0
      }
    },
    
    // Remove expired sessions
    async cleanExpiredSessions() {
      try {
        const result = await fastify.db.delete(
          'DELETE FROM sessions WHERE expires_at < datetime(\'now\')',
          [],
          'sessions'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Cleanup: ${result.changes} expired sessions removed`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error cleaning sessions: ${err.message}`)
        return 0
      }
    },
    
    // Anonymize deleted users (after a retention period)
    async anonymizeDeletedUsers(retentionDays = 90) {
      try {
        // Users deleted more than 90 days ago
        const result = await fastify.db.update(
          `UPDATE users 
           SET email = 'deleted_user_' || id || '_' || substr('000000' || abs(random()), -6) || '@anonymized.local', 
               username = 'deleted_user_' || id || '_' || substr('000000' || abs(random()), -6),
               password_hash = NULL,
               salt = NULL,
               oauth_id = NULL,
               is_anonymized = TRUE,
               is_active = FALSE
           WHERE is_deleted = TRUE 
           AND updated_at < datetime('now', '-${retentionDays} days')
           AND is_anonymized IS NOT TRUE
           AND is_active = TRUE`,
          [],
          'users'
        )
        
        if (result.changes > 0) {
          fastify.logger.info(`Cleanup: ${result.changes} deleted users anonymized`)
        }
        
        return result.changes
      } catch (err) {
        fastify.logger.error(`Error anonymizing users: ${err.message}`)
        return 0
      }
    }
  }
  
  // Run periodic cleanup (every 24 hours)
  const runCleanupTasks = async () => {
    fastify.logger.info('Starting data retention and cleanup tasks')
    
    await cleanupTasks.cleanExpiredRefreshTokens()
    await cleanupTasks.cleanExpiredResetTokens()
    await cleanupTasks.cleanExpiredSessions()
    await cleanupTasks.anonymizeDeletedUsers()
    
    fastify.logger.info('Cleanup tasks completed')
  }
  
  // Execute immediately at startup
  runCleanupTasks()
  
  // Schedule periodic execution
  const interval = setInterval(runCleanupTasks, 1000 * 60 * 60 * 24) // 24 hours
  
  // Decorate fastify with cleanup functions (for manual use or tests)
  fastify.decorate('dataRetention', { ...cleanupTasks, runCleanup: runCleanupTasks })
  
  // Cleanup on shutdown
  fastify.addHook('onClose', (instance, done) => { clearInterval(interval); done() })
  
  fastify.logger.info('Data retention plugin initialized')
}

module.exports = fp(dataRetentionPlugin, { name: 'dataRetention', dependencies: ['db', 'logger'] })
