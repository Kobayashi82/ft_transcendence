'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  const db = fastify.sqlite

  // Inicializamos la base de datos SQLite
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Agregamos un método para obtener usuarios
  fastify.decorate("getUsers", async () => db.prepare("SELECT * FROM users").all())

  // Agregamos un método para crear usuarios
  fastify.decorate("createUser", async (username) => {
    try {
      const stmt = db.prepare("INSERT INTO users (username) VALUES (?)")
      const info = stmt.run(username)
      return { id: info.lastInsertRowid, username }
    } catch (err) {
      throw new Error(`Error creating user: ${err.message}`)
    }
  })
})