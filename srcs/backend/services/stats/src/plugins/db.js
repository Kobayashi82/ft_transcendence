// db/config.js
const fp = require('fastify-plugin');
const SQLite = require('better-sqlite3');
const path = require('path');

async function dbPlugin(fastify, options) {
  
  // Get database path from options or use default
  const dbPath = path.resolve(options.database?.path || './data/stats.db');
  
  // Connect to SQLite database
  const db = new SQLite(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize database schema
  function initializeDatabase() {
    // Create games table
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        settings TEXT NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL
      )
    `);

    // Create players table
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE
      )
    `);

    // Create game_players table (for the many-to-many relationship between games and players)
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(game_id, player_id)
      )
    `);

    // Create tournaments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        settings TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
      )
    `);

    // Create tournament_players table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        final_position INTEGER NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(tournament_id, player_id)
      )
    `);

    fastify.log.info('Database schema initialized');
  }
  
  // Initialize the database
  initializeDatabase();
  
  // Make the database connection available through the fastify instance
  fastify.decorate('db', db);
  
  // Close the database connection when fastify is shutting down
  fastify.addHook('onClose', (instance, done) => {
    if (db) {
      instance.log.info('Closing database connection');
      db.close();
    }
    done();
  });
}

module.exports = fp(dbPlugin, { name: 'db' });
