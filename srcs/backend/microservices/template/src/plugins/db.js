'use strict'

const fp = require('fastify-plugin')
const SQLite = require('better-sqlite3')
const path = require('path')

async function dbPlugin(fastify, options) {
  // Crear una conexión a la base de datos SQLite
  const dbPath = path.resolve(options.database.path)
  
  fastify.log.info(`Conectando a la base de datos SQLite en ${dbPath}`)
  
  const db = new SQLite(dbPath, { verbose: fastify.log.debug })
  
  // Inicializar esquema de base de datos
  db.exec(`
    CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Decorar la instancia de fastify con funciones de la base de datos
  fastify.decorate('db', db)
  
  // Agregar métodos de ejemplo para acceder a la base de datos
  fastify.decorate('getExamples', async () => {
    return db.prepare('SELECT * FROM examples').all()
  })
  
  fastify.decorate('addExample', async (name) => {
    try {
      const stmt = db.prepare('INSERT INTO examples (name) VALUES (?)')
      const info = stmt.run(name)
      return { id: info.lastInsertRowid, name }
    } catch (err) {
      throw new Error(`Error al crear ejemplo: ${err.message}`)
    }
  })
  
  // Cerrar la conexión cuando el servidor se apague
  fastify.addHook('onClose', (instance, done) => {
    if (db) db.close()
    done()
  })
}

module.exports = fp(dbPlugin, {
  name: 'db',
  dependencies: []
})