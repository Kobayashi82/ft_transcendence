'use strict'

const fp = require('fastify-plugin')
const SQLite = require('better-sqlite3')
const path = require('path')

async function dbPlugin(fastify, options) {
  // Crear una conexión a la base de datos SQLite
  const dbPath = path.resolve(options.database.path)
  
  const db = new SQLite(dbPath, { verbose: fastify.log.debug })
  
  // Inicializar esquema de base de datos
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  // Métodos específicos para usuarios
  fastify.decorate('users', {
    // Obtener todos los usuarios
    async getAll() {
      return fastify.db.all('SELECT * FROM users', [], 'users')
    },
    
    // Obtener un usuario por ID
    async getById(id) {
      return fastify.db.get('SELECT * FROM users WHERE id = ?', [id], 'users')
    },
    
    // Obtener un usuario por nombre de usuario
    async getByUsername(username) {
      return fastify.db.get('SELECT * FROM users WHERE username = ?', [username], 'users')
    },
    
    // Obtener un usuario por correo electrónico
    async getByEmail(email) {
      return fastify.db.get('SELECT * FROM users WHERE email = ?', [email], 'users')
    },
    
    // Crear un nuevo usuario
    async create(userData) {
      try {
        const result = await fastify.db.insert(
          'INSERT INTO users (username, email) VALUES (?, ?)',
          [userData.username, userData.email],
          'users'
        )
        return { id: result.id, ...userData }
      } catch (err) {
        throw new Error(`Error al crear usuario: ${err.message}`)
      }
    },
    
    // Actualizar un usuario existente
    async update(id, userData) {
      try {
        const result = await fastify.db.update(
          'UPDATE users SET username = ?, email = ? WHERE id = ?',
          [userData.username, userData.email, id],
          'users'
        )
        return { id, changes: result.changes, ...userData }
      } catch (err) {
        throw new Error(`Error al actualizar usuario: ${err.message}`)
      }
    },
    
    // Eliminar un usuario
    async delete(id) {
      try {
        return await fastify.db.delete('DELETE FROM users WHERE id = ?', [id], 'users')
      } catch (err) {
        throw new Error(`Error al eliminar usuario: ${err.message}`)
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