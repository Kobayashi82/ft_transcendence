'use strict'

const fp = require('fastify-plugin')
const SQLite = require('better-sqlite3')
const path = require('path')

async function dbPlugin(fastify, options) {
  // Crear una conexión a la base de datos SQLite
  const dbPath = path.resolve(options.database.path)
  
  const db = new SQLite(dbPath, { 
    verbose: fastify.log.debug,
    timeout: options.database.operationTimeout || 5000 // Timeout para operaciones
  })
  
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
        is_anonymized BOOLEAN DEFAULT FALSE,
        phone TEXT,
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
  
  fastify.logger.info(`SQLite conectado en ${dbPath}`)

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
      
      fastify.logger.error(`Error en operación de base de datos ${operation} en ${entity}: ${error.message}`, {
        error: error.message,
        operation,
        entity
      })
      
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
      const { email, username, password_hash, account_type, oauth_id = null, phone = null } = userData
      
      // Sanitizar datos
      const sanitizedUsername = fastify.security ? fastify.security.sanitizeInput(username) : username
      
      try {
        return await fastify.db.transaction(async () => {
          // Insertar usuario
          let sql = 'INSERT INTO users (email, username, password_hash, account_type, oauth_id'
          let params = [email, sanitizedUsername, password_hash, account_type, oauth_id]
          
          // Cifrar teléfono si se proporciona
          if (phone && fastify.security) {
            sql += ', phone) VALUES (?, ?, ?, ?, ?, ?)'
            try {
              const encryptedPhone = fastify.security.encrypt(phone)
              params.push(encryptedPhone)
            } catch (err) {
              fastify.logger.error(`Error al cifrar teléfono: ${err.message}`)
              sql += ') VALUES (?, ?, ?, ?, ?)'
            }
          } else {
            sql += ') VALUES (?, ?, ?, ?, ?)'
          }
          
          const result = await fastify.db.insert(sql, params, 'users')
          
          const userId = result.id
          
          // Asignar rol por defecto
          await fastify.db.insert(
            'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
            [userId, 'user'],
            'user_roles'
          )
          
          // Obtener el usuario creado
          const user = await this.getUserById(userId)
          
          fastify.logger.info(`Usuario creado: ID=${userId}, Email=${email}`, { userId, email })
          
          return user
        }, 'users')
      } catch (err) {
        fastify.logger.error(`Error al crear usuario: ${err.message}`)
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
        const sanitizedUsername = fastify.security ? fastify.security.sanitizeInput(username) : username
        params.push(sanitizedUsername)
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
        
        fastify.logger.info(`Usuario actualizado: ID=${id}`, { userId: id })
        
        return await this.getUserById(id)
      } catch (err) {
        fastify.logger.error(`Error al actualizar usuario: ${err.message}`, { userId: id })
        throw new Error(`Error al actualizar usuario: ${err.message}`)
      }
    },
    
    // Actualizar usuario con datos cifrados
    async updateUserSecure(id, userData) {
      const { email, username, password_hash, is_active, has_2fa, phone } = userData
      
      // Construir la consulta dinámicamente según los campos proporcionados
      let setClause = []
      let params = []
      
      if (email !== undefined) {
        setClause.push('email = ?')
        params.push(email)
      }
      
      if (username !== undefined) {
        setClause.push('username = ?')
        const sanitizedUsername = fastify.security ? fastify.security.sanitizeInput(username) : username
        params.push(sanitizedUsername)
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
      
      // Cifrar teléfono si se proporciona
      if (phone !== undefined && phone !== null && fastify.security) {
        setClause.push('phone = ?')
        try {
          const encryptedPhone = fastify.security.encrypt(phone)
          params.push(encryptedPhone)
        } catch (err) {
          fastify.logger.error(`Error al cifrar teléfono: ${err.message}`)
          params.push(null)
        }
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
        
        fastify.logger.info(`Usuario actualizado de forma segura: ID=${id}`, { userId: id })
        return await this.getUserById(id)
      } catch (err) {
        fastify.logger.error(`Error al actualizar usuario: ${err.message}`, { 
          error: err.message, 
          userId: id 
        })
        throw new Error(`Error al actualizar usuario: ${err.message}`)
      }
    },
    
    // Obtener datos descifrados
    async getUserWithDecryptedData(id) {
      const user = await this.getUserById(id)
      
      if (!user) return null
      
      // Descifrar teléfono si existe
      if (user.phone && fastify.security) {
        try {
          user.phone = fastify.security.decrypt(user.phone)
        } catch (err) {
          fastify.logger.error(`Error al descifrar teléfono: ${err.message}`, { userId: id })
          user.phone = null
        }
      }
      
      return user
    },
    
    // Registrar último login
    async updateLastLogin(id) {
      try {
        await fastify.db.update(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [id],
          'users'
        )
        fastify.logger.debug(`Último login actualizado: ID=${id}`, { userId: id })
        return true
      } catch (err) {
        fastify.logger.error(`Error al actualizar último login: ${err.message}`, { userId: id })
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
        
        fastify.logger.info(`Usuario eliminado (soft delete): ID=${id}`, { userId: id })
        
        return { id, deleted: true }
      } catch (err) {
        fastify.logger.error(`Error al eliminar usuario: ${err.message}`, { userId: id })
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
          
          fastify.logger.info(`Roles actualizados para usuario: ID=${userId}`, { userId, roles })
          
          return { userId, roles, updated: true }
        }, 'user_roles')
      } catch (err) {
        fastify.logger.error(`Error al actualizar roles de usuario: ${err.message}`, { userId })
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
        
        fastify.logger.debug(`Token de refresco creado para usuario: ID=${userId}`, { 
          userId, 
          tokenId: result.id,
          expiresAt 
        })
        
        return {
          id: result.id,
          userId,
          token,
          expiresAt
        }
      } catch (err) {
        fastify.logger.error(`Error al crear token de refresco: ${err.message}`, { userId })
        throw new Error(`Error al crear token de refresco: ${err.message}`)
      }
    },
    
    async getRefreshToken(token) {
      try {
        return await fastify.db.get(
          'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = false AND expires_at > CURRENT_TIMESTAMP',
          [token],
          'refresh_tokens'
        )
      } catch (err) {
        fastify.logger.error(`Error al obtener token de refresco: ${err.message}`)
        throw err
      }
    },
    
    async revokeRefreshToken(token) {
      try {
        await fastify.db.update(
          'UPDATE refresh_tokens SET revoked = true WHERE token = ?',
          [token],
          'refresh_tokens'
        )
        
        fastify.logger.debug(`Token de refresco revocado: ${token.substring(0, 8)}...`)
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al revocar token de refresco: ${err.message}`)
        throw new Error(`Error al revocar token de refresco: ${err.message}`)
      }
    },
    
    async revokeAllRefreshTokens(userId) {
      try {
        const result = await fastify.db.update(
          'UPDATE refresh_tokens SET revoked = true WHERE user_id = ?',
          [userId],
          'refresh_tokens'
        )
        
        fastify.logger.info(`Todos los tokens de refresco revocados para usuario: ID=${userId}`, {
          userId,
          tokensRevoked: result.changes
        })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al revocar todos los tokens de refresco: ${err.message}`, { userId })
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
        
        // Cifrar phone si es proporcionado y existe el módulo de seguridad
        let encryptedPhone = null
        if (phone && fastify.security) {
          try {
            encryptedPhone = fastify.security.encrypt(phone)
          } catch (err) {
            fastify.logger.error(`Error al cifrar teléfono para 2FA: ${err.message}`, { userId })
          }
        }
        
        if (existing) {
          // Actualizar existente
          await fastify.db.update(
            'UPDATE two_factor SET secret = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [secret, encryptedPhone || phone, existing.id],
            'two_factor'
          )
          
          fastify.logger.info(`Configuración 2FA actualizada para usuario: ID=${userId}, Tipo=${type}`, {
            userId,
            type
          })
          
          return { id: existing.id, updated: true }
        } else {
          // Crear nuevo
          const result = await fastify.db.insert(
            'INSERT INTO two_factor (user_id, type, secret, phone) VALUES (?, ?, ?, ?)',
            [userId, type, secret, encryptedPhone || phone],
            'two_factor'
          )
          
          fastify.logger.info(`Configuración 2FA creada para usuario: ID=${userId}, Tipo=${type}`, {
            userId,
            type
          })
          
          return { id: result.id, created: true }
        }
      } catch (err) {
        fastify.logger.error(`Error al gestionar 2FA: ${err.message}`, { userId, type })
        throw new Error(`Error al gestionar 2FA: ${err.message}`)
      }
    },
    
    async get2FAConfig(userId, type) {
      try {
        const config = await fastify.db.get(
          'SELECT * FROM two_factor WHERE user_id = ? AND type = ?',
          [userId, type],
          'two_factor'
        )
        
        // Descifrar teléfono si existe y está el módulo de seguridad
        if (config && config.phone && fastify.security) {
          try {
            config.phone = fastify.security.decrypt(config.phone)
          } catch (err) {
            fastify.logger.error(`Error al descifrar teléfono para 2FA: ${err.message}`, { userId })
            config.phone = null
          }
        }
        
        return config
      } catch (err) {
        fastify.logger.error(`Error al obtener configuración 2FA: ${err.message}`, { userId, type })
        throw err
      }
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
        
        fastify.logger.info(`2FA verificado para usuario: ID=${userId}, Tipo=${type}`, {
          userId,
          type
        })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al verificar 2FA: ${err.message}`, { userId, type })
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
        
        fastify.logger.info(`2FA habilitado para usuario: ID=${userId}, Tipo=${type}`, {
          userId,
          type
        })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al habilitar 2FA: ${err.message}`, { userId, type })
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
        
        fastify.logger.info(`2FA deshabilitado para usuario: ID=${userId}`, { userId })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al deshabilitar 2FA: ${err.message}`, { userId })
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
        
        fastify.logger.info(`Token de reseteo de contraseña creado para usuario: ID=${userId}`, {
          userId,
          expiresAt
        })
        
        return {
          id: result.id,
          userId,
          token,
          expiresAt
        }
      } catch (err) {
        fastify.logger.error(`Error al crear token de reseteo: ${err.message}`, { userId })
        throw new Error(`Error al crear token de reseteo: ${err.message}`)
      }
    },
    
    async getPasswordResetToken(token) {
      try {
        return await fastify.db.get(
          'SELECT * FROM password_reset WHERE token = ? AND used = false AND expires_at > CURRENT_TIMESTAMP',
          [token],
          'password_reset'
        )
      } catch (err) {
        fastify.logger.error(`Error al obtener token de reseteo: ${err.message}`)
        throw err
      }
    },
    
    async usePasswordResetToken(token) {
      try {
        await fastify.db.update(
          'UPDATE password_reset SET used = true WHERE token = ?',
          [token],
          'password_reset'
        )
        
        fastify.logger.info(`Token de reseteo de contraseña utilizado: ${token.substring(0, 8)}...`)
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al usar token de reseteo: ${err.message}`)
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
        
        fastify.logger.info(`Sesión creada para usuario: ID=${userId}`, {
          userId,
          sessionId: result.id,
          ip,
          expiresAt
        })
        
        return {
          id: result.id,
          userId,
          tokenId,
          expiresAt
        }
      } catch (err) {
        fastify.logger.error(`Error al crear sesión: ${err.message}`, { userId, ip })
        throw new Error(`Error al crear sesión: ${err.message}`)
      }
    },
    
    async getActiveSessions(userId) {
      try {
        return await fastify.db.all(
          'SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND revoked = false AND expires_at > CURRENT_TIMESTAMP',
          [userId],
          'sessions'
        )
      } catch (err) {
        fastify.logger.error(`Error al obtener sesiones activas: ${err.message}`, { userId })
        throw err
      }
    },
    
    async revokeSession(id, userId) {
      try {
        await fastify.db.update(
          'UPDATE sessions SET revoked = true WHERE id = ? AND user_id = ?',
          [id, userId],
          'sessions'
        )
        
        fastify.logger.info(`Sesión revocada: ID=${id} para usuario ID=${userId}`, {
          sessionId: id,
          userId
        })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al revocar sesión: ${err.message}`, { sessionId: id, userId })
        throw new Error(`Error al revocar sesión: ${err.message}`)
      }
    },

    // Método corregido para preservar la sesión actual
    async revokeAllSessions(userId, currentTokenId = null) {
      try {
        let sql = 'UPDATE sessions SET revoked = true WHERE user_id = ?';
        let params = [userId];
        
        // Si se proporciona un token ID actual, preservar esa sesión
        if (currentTokenId) {
          sql += ' AND token_id != ?';
          params.push(currentTokenId);
        }
        
        const result = await fastify.db.update(
          sql,
          params,
          'sessions'
        )
        
        fastify.logger.info(`Sesiones revocadas para usuario: ID=${userId}`, {
          userId,
          sessionsRevoked: result.changes,
          preservedSession: currentTokenId ? true : false
        })
        
        return true
      } catch (err) {
        fastify.logger.error(`Error al revocar sesiones: ${err.message}`, { userId })
        throw new Error(`Error al revocar sesiones: ${err.message}`)
      }
    },
    
    // Estadísticas y métricas
    async getUsersCount() {
      try {
        const result = await fastify.db.get(
          'SELECT COUNT(*) as count FROM users WHERE is_deleted = false',
          [],
          'users'
        )
        return result.count
      } catch (err) {
        fastify.logger.error(`Error al obtener conteo de usuarios: ${err.message}`)
        return 0
      }
    },
    
    async getActiveUsersCount() {
      try {
        const result = await fastify.db.get(
          'SELECT COUNT(*) as count FROM users WHERE is_active = true AND is_deleted = false',
          [],
          'users'
        )
        return result.count
      } catch (err) {
        fastify.logger.error(`Error al obtener conteo de usuarios activos: ${err.message}`)
        return 0
      }
    },
    
    async getSessionsCount() {
      try {
        const result = await fastify.db.get(
          'SELECT COUNT(*) as count FROM sessions WHERE revoked = false AND expires_at > CURRENT_TIMESTAMP',
          [],
          'sessions'
        )
        return result.count
      } catch (err) {
        fastify.logger.error(`Error al obtener conteo de sesiones: ${err.message}`)
        return 0
      }
    },

    // Método para obtener todos los dispositivos de un usuario
    async getUserDevices(userId) {
      // Aquí no necesitamos referencia a fastify directamente
      // porque ya tenemos acceso a this.db y a fastify.logger a través del contexto
      try {

        if (!this.db) {
          return []; // Si no existe, simplemente devolver un array vacío
        }
        // Comprobar si la tabla tiene la columna device_id
        const hasDeviceIdColumn = await this.db.get(
          "SELECT COUNT(*) as count FROM pragma_table_info('refresh_tokens') WHERE name = 'device_id'",
          [],
          'refresh_tokens'
        );
        
        // Si no existe la columna device_id, devolver array vacío
        if (!hasDeviceIdColumn || hasDeviceIdColumn.count === 0) {
          return [];
        }
        
        // Si existe la columna, obtener los dispositivos
        return await this.db.all(
          `SELECT DISTINCT 
            device_id, 
            device_name, 
            device_type, 
            MAX(created_at) as last_used, 
            COUNT(*) as login_count 
          FROM refresh_tokens 
          WHERE user_id = ? AND device_id IS NOT NULL 
          GROUP BY device_id
          ORDER BY last_used DESC`,
          [userId],
          'refresh_tokens'
        );
      } catch (err) {
        // Usar la referencia de logger a través de fastify que ya está disponible en el contexto
        fastify.logger.error(`Error al obtener dispositivos del usuario: ${err.message}`, { userId });
        // En caso de error, devolver array vacío
        return [];
      }
    }

  })

  // Cerrar la conexión cuando el servidor se apague
  fastify.addHook('onClose', (instance, done) => {
    if (db) {
      fastify.logger.info('Cerrando conexión SQLite')
      db.close()
    }
    done()
  })
  
  fastify.logger.info('Plugin de base de datos inicializado correctamente')
}

module.exports = fp(dbPlugin, { name: 'db', dependencies: ['metrics', 'logger'] })