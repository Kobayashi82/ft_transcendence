'use strict'

const fp = require('fastify-plugin')
const SQLite = require('better-sqlite3')
const path = require('path')

async function dbPlugin(fastify, options) {
  // Crear una conexión a la base de datos SQLite
  const dbPath = path.resolve(options.database.path)
  
  const db = new SQLite(dbPath, { verbose: fastify.log.debug })
  
  // Inicializar esquema de base de datos para autenticación
  db.exec(`
    -- Tabla principal de usuarios (información de autenticación)
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password_hash TEXT,
        salt TEXT,
        account_type TEXT NOT NULL CHECK (account_type IN ('local', 'google', '42')),
        oauth_id TEXT,
        has_2fa BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla para roles de usuario
    CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabla para configuración de 2FA
    CREATE TABLE IF NOT EXISTS two_factor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('app', 'email', 'sms')),
        secret TEXT NOT NULL,
        phone TEXT,
        backup_codes TEXT,
        verified BOOLEAN DEFAULT FALSE,
        enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabla para tokens de refresco
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabla para tokens de reseteo de contraseña
    CREATE TABLE IF NOT EXISTS password_reset (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabla para registro de sesiones
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)
  
  console.log(`SQLite connected`)

  // Función auxiliar para medir y registrar operaciones de base de datos
  const measureDbOp = async (operation, entity, fn) => {
    const startTime = process.hrtime()
    try {
      const result = await fn()
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      // Registrar operación exitosa
      if (fastify.metrics && fastify.metrics.db) {
        fastify.metrics.db.recordOperation(operation, entity, 'success')
        fastify.metrics.db.recordDuration(operation, entity, duration)
      }
      
      return result
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds + nanoseconds / 1e9
      
      // Registrar operación con error
      if (fastify.metrics && fastify.metrics.db) {
        fastify.metrics.db.recordOperation(operation, entity, 'error')
        fastify.metrics.db.recordDuration(operation, entity, duration)
      }
      
      throw error
    }
  }
  
  // Decorar la instancia de fastify con funciones de la base de datos
  fastify.decorate('db', {
    // Exponer la instancia original de SQLite para operaciones directas
    sqlite: db,
    
    // Método para ejecutar consultas arbitrarias con métricas
    async query(sql, params = [], operation = 'query', entity = 'generic') {
      return measureDbOp(operation, entity, async () => {
        const stmt = db.prepare(sql)
        if (sql.trim().toLowerCase().startsWith('select')) {
          return stmt.all(params)
        } else {
          return stmt.run(params)
        }
      })
    },
    
    // Método para obtener un solo registro
    async get(sql, params = [], entity = 'generic') {
      return measureDbOp('get', entity, async () => {
        const stmt = db.prepare(sql)
        return stmt.get(params)
      })
    },
    
    // Método para obtener múltiples registros
    async all(sql, params = [], entity = 'generic') {
      return measureDbOp('all', entity, async () => {
        const stmt = db.prepare(sql)
        return stmt.all(params)
      })
    },
    
    // Método para insertar datos
    async insert(sql, params = [], entity = 'generic') {
      return measureDbOp('insert', entity, async () => {
        const stmt = db.prepare(sql)
        const info = stmt.run(params)
        return { id: info.lastInsertRowid, changes: info.changes }
      })
    },
    
    // Método para actualizar datos
    async update(sql, params = [], entity = 'generic') {
      return measureDbOp('update', entity, async () => {
        const stmt = db.prepare(sql)
        const info = stmt.run(params)
        return { changes: info.changes }
      })
    },
    
    // Método para eliminar datos
    async delete(sql, params = [], entity = 'generic') {
      return measureDbOp('delete', entity, async () => {
        const stmt = db.prepare(sql)
        const info = stmt.run(params)
        return { changes: info.changes }
      })
    },
    
    // Método para ejecutar una transacción
    async transaction(fn, entity = 'generic') {
      return measureDbOp('transaction', entity, async () => {
        const transaction = db.transaction(fn)
        return transaction()
      })
    }
  })
  
  // Servicio de autenticación
  fastify.decorate('authDB', {
    // Obtener usuario por ID
    async getUserById(id) {
      const user = await fastify.db.get('SELECT * FROM users WHERE id = ? AND is_deleted = false', [id], 'users')
      if (user) {
        // Obtener roles del usuario
        const roles = await fastify.db.all('SELECT role FROM user_roles WHERE user_id = ?', [id], 'user_roles')
        user.roles = roles.map(role => role.role)
        return user
      }
      return null
    },
    
    // Obtener usuario por email
    async getUserByEmail(email) {
      const user = await fastify.db.get('SELECT * FROM users WHERE email = ? AND is_deleted = false', [email], 'users')
      if (user) {
        // Obtener roles del usuario
        const roles = await fastify.db.all('SELECT role FROM user_roles WHERE user_id = ?', [user.id], 'user_roles')
        user.roles = roles.map(role => role.role)
        return user
      }
      return null
    },
    
    // Obtener usuario por OAuth ID
    async getUserByOAuthId(oauthId, provider) {
      const user = await fastify.db.get(
        'SELECT * FROM users WHERE oauth_id = ? AND account_type = ? AND is_deleted = false', 
        [oauthId, provider], 
        'users'
      )
      if (user) {
        // Obtener roles del usuario
        const roles = await fastify.db.all('SELECT role FROM user_roles WHERE user_id = ?', [user.id], 'user_roles')
        user.roles = roles.map(role => role.role)
        return user
      }
      return null
    },
    
    // Crear un nuevo usuario
    async createUser(userData) {
      const { email, username, password_hash, account_type, oauth_id = null } = userData
      
      try {
        return await fastify.db.transaction(async () => {
          // Insertar usuario
          const result = await fastify.db.insert(
            'INSERT INTO users (email, username, password_hash, account_type, oauth_id) VALUES (?, ?, ?, ?, ?)',
            [email, username, password_hash, account_type, oauth_id],
            'users'
          )
          
          const userId = result.id
          
          // Asignar rol por defecto
          await fastify.db.insert(
            'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
            [userId, 'user'],
            'user_roles'
          )
          
          // Obtener el usuario creado
          const user = await this.getUserById(userId)
          return user
        }, 'users')
      } catch (err) {
        throw new Error(`Error al crear usuario: ${err.message}`)
      }
    },
    
    // Actualizar un usuario
    async updateUser(id, userData) {
      const { email, username, password_hash, is_active, has_2fa } = userData
      
      // Construir la consulta dinámicamente según los campos proporcionados
      let setClause = []
      let params = []
      
      if (email !== undefined) {
        setClause.push('email = ?')
        params.push(email)
      }
      
      if (username !== undefined) {
        setClause.push('username = ?')
        params.push(username)
      }
      
      if (password_hash !== undefined) {
        setClause.push('password_hash = ?')
        params.push(password_hash)
      }
      
      if (is_active !== undefined) {
        setClause.push('is_active = ?')
        params.push(is_active)
      }
      
      if (has_2fa !== undefined) {
        setClause.push('has_2fa = ?')
        params.push(has_2fa)
      }
      
      // Añadir siempre updated_at
      setClause.push('updated_at = CURRENT_TIMESTAMP')
      
      // Si no hay nada que actualizar, devolver
      if (setClause.length === 1) {
        const user = await this.getUserById(id)
        return user
      }
      
      params.push(id)
      
      try {
        await fastify.db.update(
          `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
          params,
          'users'
        )
        
        return await this.getUserById(id)
      } catch (err) {
        throw new Error(`Error al actualizar usuario: ${err.message}`)
      }
    },
    
    // Registrar último login
    async updateLastLogin(id) {
      try {
        await fastify.db.update(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [id],
          'users'
        )
        return true
      } catch (err) {
        throw new Error(`Error al actualizar último login: ${err.message}`)
      }
    },
    
    // Eliminar usuario (soft delete)
    async deleteUser(id) {
      try {
        await fastify.db.update(
          'UPDATE users SET is_deleted = true, is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id],
          'users'
        )
        
        // Revocar todos los tokens de refresco
        await fastify.db.update(
          'UPDATE refresh_tokens SET revoked = true WHERE user_id = ?',
          [id],
          'refresh_tokens'
        )
        
        // Revocar todas las sesiones
        await fastify.db.update(
          'UPDATE sessions SET revoked = true WHERE user_id = ?',
          [id],
          'sessions'
        )
        
        return { id, deleted: true }
      } catch (err) {
        throw new Error(`Error al eliminar usuario: ${err.message}`)
      }
    },
    
    // Actualizar roles de usuario
    async updateUserRoles(userId, roles) {
      try {
        return await fastify.db.transaction(async () => {
          // Eliminar roles actuales
          await fastify.db.delete(
            'DELETE FROM user_roles WHERE user_id = ?',
            [userId],
            'user_roles'
          )
          
          // Añadir nuevos roles
          for (const role of roles) {
            await fastify.db.insert(
              'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
              [userId, role],
              'user_roles'
            )
          }
          
          return { userId, roles, updated: true }
        }, 'user_roles')
      } catch (err) {
        throw new Error(`Error al actualizar roles de usuario: ${err.message}`)
      }
    },
    
    // Gestión de tokens de refresco
    async createRefreshToken(userId, token, expiresIn) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      
      try {
        const result = await fastify.db.insert(
          'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
          [userId, token, expiresAt],
          'refresh_tokens'
        )
        
        return {
          id: result.id,
          userId,
          token,
          expiresAt
        }
      } catch (err) {
        throw new Error(`Error al crear token de refresco: ${err.message}`)
      }
    },
    
    async getRefreshToken(token) {
      return await fastify.db.get(
        'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = false AND expires_at > CURRENT_TIMESTAMP',
        [token],
        'refresh_tokens'
      )
    },
    
    async revokeRefreshToken(token) {
      try {
        await fastify.db.update(
          'UPDATE refresh_tokens SET revoked = true WHERE token = ?',
          [token],
          'refresh_tokens'
        )
        return true
      } catch (err) {
        throw new Error(`Error al revocar token de refresco: ${err.message}`)
      }
    },
    
    async revokeAllRefreshTokens(userId) {
      try {
        await fastify.db.update(
          'UPDATE refresh_tokens SET revoked = true WHERE user_id = ?',
          [userId],
          'refresh_tokens'
        )
        return true
      } catch (err) {
        throw new Error(`Error al revocar todos los tokens de refresco: ${err.message}`)
      }
    },
    
    // Gestión de 2FA
    async createOrUpdate2FA(userId, type, secret, phone = null) {
      try {
        // Comprobar si ya existe
        const existing = await fastify.db.get(
          'SELECT id FROM two_factor WHERE user_id = ? AND type = ?',
          [userId, type],
          'two_factor'
        )
        
        if (existing) {
          // Actualizar existente
          await fastify.db.update(
            'UPDATE two_factor SET secret = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [secret, phone, existing.id],
            'two_factor'
          )
          return { id: existing.id, updated: true }
        } else {
          // Crear nuevo
          const result = await fastify.db.insert(
            'INSERT INTO two_factor (user_id, type, secret, phone) VALUES (?, ?, ?, ?)',
            [userId, type, secret, phone],
            'two_factor'
          )
          return { id: result.id, created: true }
        }
      } catch (err) {
        throw new Error(`Error al gestionar 2FA: ${err.message}`)
      }
    },
    
    async get2FAConfig(userId, type) {
      return await fastify.db.get(
        'SELECT * FROM two_factor WHERE user_id = ? AND type = ?',
        [userId, type],
        'two_factor'
      )
    },
    
    async verify2FA(userId, type) {
      try {
        await fastify.db.update(
          'UPDATE two_factor SET verified = true WHERE user_id = ? AND type = ?',
          [userId, type],
          'two_factor'
        )
        
        // Actualizar estado en la tabla de usuarios
        await fastify.db.update(
          'UPDATE users SET has_2fa = true WHERE id = ?',
          [userId],
          'users'
        )
        
        return true
      } catch (err) {
        throw new Error(`Error al verificar 2FA: ${err.message}`)
      }
    },
    
    async enable2FA(userId, type) {
      try {
        await fastify.db.update(
          'UPDATE two_factor SET enabled = true WHERE user_id = ? AND type = ?',
          [userId, type],
          'two_factor'
        )
        return true
      } catch (err) {
        throw new Error(`Error al habilitar 2FA: ${err.message}`)
      }
    },
    
    async disable2FA(userId) {
      try {
        // Desactivar configuración 2FA
        await fastify.db.update(
          'UPDATE two_factor SET enabled = false WHERE user_id = ?',
          [userId],
          'two_factor'
        )
        
        // Actualizar estado en la tabla de usuarios
        await fastify.db.update(
          'UPDATE users SET has_2fa = false WHERE id = ?',
          [userId],
          'users'
        )
        
        return true
      } catch (err) {
        throw new Error(`Error al deshabilitar 2FA: ${err.message}`)
      }
    },
    
    // Gestión de tokens de reseteo de contraseña
    async createPasswordResetToken(userId, token, expiresIn = 3600) { // 1 hora por defecto
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      
      try {
        // Invalidar tokens anteriores
        await fastify.db.update(
          'UPDATE password_reset SET used = true WHERE user_id = ? AND used = false',
          [userId],
          'password_reset'
        )
        
        // Crear nuevo token
        const result = await fastify.db.insert(
          'INSERT INTO password_reset (user_id, token, expires_at) VALUES (?, ?, ?)',
          [userId, token, expiresAt],
          'password_reset'
        )
        
        return {
          id: result.id,
          userId,
          token,
          expiresAt
        }
      } catch (err) {
        throw new Error(`Error al crear token de reseteo: ${err.message}`)
      }
    },
    
    async getPasswordResetToken(token) {
      return await fastify.db.get(
        'SELECT * FROM password_reset WHERE token = ? AND used = false AND expires_at > CURRENT_TIMESTAMP',
        [token],
        'password_reset'
      )
    },
    
    async usePasswordResetToken(token) {
      try {
        await fastify.db.update(
          'UPDATE password_reset SET used = true WHERE token = ?',
          [token],
          'password_reset'
        )
        return true
      } catch (err) {
        throw new Error(`Error al usar token de reseteo: ${err.message}`)
      }
    },
    
    // Gestión de sesiones
    async createSession(userId, tokenId, ip, userAgent, expiresIn) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      
      try {
        const result = await fastify.db.insert(
          'INSERT INTO sessions (user_id, token_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
          [userId, tokenId, ip, userAgent, expiresAt],
          'sessions'
        )
        
        return {
          id: result.id,
          userId,
          tokenId,
          expiresAt
        }
      } catch (err) {
        throw new Error(`Error al crear sesión: ${err.message}`)
      }
    },
    
    async getActiveSessions(userId) {
      return await fastify.db.all(
        'SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND revoked = false AND expires_at > CURRENT_TIMESTAMP',
        [userId],
        'sessions'
      )
    },
    
    async revokeSession(id, userId) {
      try {
        await fastify.db.update(
          'UPDATE sessions SET revoked = true WHERE id = ? AND user_id = ?',
          [id, userId],
          'sessions'
        )
        return true
      } catch (err) {
        throw new Error(`Error al revocar sesión: ${err.message}`)
      }
    },
    
    async revokeAllSessions(userId) {
      try {
        await fastify.db.update(
          'UPDATE sessions SET revoked = true WHERE user_id = ?',
          [userId],
          'sessions'
        )
        return true
      } catch (err) {
        throw new Error(`Error al revocar todas las sesiones: ${err.message}`)
      }
    }
  })
  
  // Cerrar la conexión cuando el servidor se apague
  fastify.addHook('onClose', (instance, done) => {
    if (db) db.close()
    done()
  })
}

module.exports = fp(dbPlugin, { name: 'db', dependencies: ['metrics'] })
