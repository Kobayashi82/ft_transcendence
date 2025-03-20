import fp from "fastify-plugin"
import Database from "better-sqlite3"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import fs from "fs"

// Obtenemos el directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default fp(async (fastify, opts) => {
  // Asegurarse de que el directorio de datos existe
  const dataDir = join(__dirname, "..", "..", "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Crear la conexión a SQLite
  const db = new Database(join(dataDir, "database.sqlite"))

  // Inicializar la base de datos
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Decorar Fastify con la instancia de SQLite
  fastify.decorate("sqlite", db)

  // Agregar métodos de utilidad
  fastify.decorate("getUsers", async () => db.prepare("SELECT * FROM users").all())

  fastify.decorate("createUser", async (username) => {
    try {
      const stmt = db.prepare("INSERT INTO users (username) VALUES (?)")
      const info = stmt.run(username)
      return { id: info.lastInsertRowid, username }
    } catch (err) {
      throw new Error(`Error creating user: ${err.message}`)
    }
  })

  // Cerrar la conexión cuando se cierre el servidor
  fastify.addHook("onClose", (instance, done) => {
    db.close()
    done()
  })
})

