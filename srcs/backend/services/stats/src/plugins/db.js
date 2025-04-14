// db/config.js
const fp = require('fastify-plugin');
const path = require('path');
const SQLite = require('better-sqlite3');

async function dbPlugin(fastify, options) {
  
  const dbPath = path.resolve(options.database?.path || './data/stats.db');
  const db = new SQLite(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  function initializeDatabase() {
    // GAMES
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

    // PLAYERS
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE
      )
    `);

    // GAME_PLAYERS (for the relationship between games and players)
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

    // TOURNAMENTS
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

    // TOURNAMENTS_PLAYERS
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

  }
  
  initializeDatabase();
  fastify.decorate('db', db);
  
  fastify.addHook('onClose', (_, done) => {
    if (db) db.close();
    done();
  });
}

module.exports = fp(dbPlugin, { name: 'db' });
