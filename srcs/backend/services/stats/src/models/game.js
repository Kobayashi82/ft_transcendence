// models/game.js
const fp = require('fastify-plugin');

async function gameModelPlugin(fastify, options) {
  const { db } = fastify;

  // Create a new game
  function createGame(gameData) {
    const { tournament_id, start_time, end_time, settings, players } = gameData;
    
    // Start a database transaction
    const transaction = db.transaction(() => {
      // Insert game
      const gameResult = db.prepare(`
        INSERT INTO games (tournament_id, start_time, end_time, settings)
        VALUES (?, ?, ?, ?)
      `).run(
        tournament_id || null,
        start_time,
        end_time,
        JSON.stringify(settings)
      );
      
      const gameId = gameResult.lastInsertRowid;
      
      // Insert player data
      for (const playerData of players) {
        const player = fastify.playerModel.getOrCreatePlayer(playerData.user_id);
        
        db.prepare(`
          INSERT INTO game_players (game_id, player_id, score)
          VALUES (?, ?, ?)
        `).run(gameId, player.id, playerData.score);
      }
      
      return gameId;
    });
    
    // Execute the transaction
    const gameId = transaction();
    
    // Return the created game
    return getGameById(gameId);
  }

  // Get game by ID
  function getGameById(id) {
    const game = db.prepare(`
      SELECT * FROM games WHERE id = ?
    `).get(id);
    
    if (!game) {
      return null;
    }
    
    // Parse the settings JSON
    game.settings = JSON.parse(game.settings);
    
    // Get players and scores for this game
    game.players = db.prepare(`
      SELECT p.id, p.user_id, gp.score
      FROM game_players gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = ?
    `).all(id);
    
    return game;
  }

  // Update a game
  function updateGame(id, gameData) {
    const { tournament_id, end_time, settings } = gameData;
    
    const result = db.prepare(`
      UPDATE games
      SET tournament_id = ?,
          end_time = ?,
          settings = ?
      WHERE id = ?
    `).run(
      tournament_id || null,
      end_time,
      settings ? JSON.stringify(settings) : db.prepare('SELECT settings FROM games WHERE id = ?').get(id).settings,
      id
    );
    
    return result.changes > 0;
  }

  // Delete a game
  function deleteGame(id) {
    const result = db.prepare('DELETE FROM games WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Get all games
  function getAllGames(limit = 100, offset = 0) {
    const games = db.prepare(`
      SELECT * FROM games
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // Parse settings and get player data for each game
    return games.map(game => {
      game.settings = JSON.parse(game.settings);
      game.players = db.prepare(`
        SELECT p.id, p.user_id, gp.score
        FROM game_players gp
        JOIN players p ON gp.player_id = p.id
        WHERE gp.game_id = ?
      `).all(game.id);
      
      return game;
    });
  }

  // Get games by tournament ID
  function getGamesByTournament(tournamentId) {
    const games = db.prepare(`
      SELECT * FROM games
      WHERE tournament_id = ?
      ORDER BY start_time ASC
    `).all(tournamentId);
    
    // Parse settings and get player data for each game
    return games.map(game => {
      game.settings = JSON.parse(game.settings);
      game.players = db.prepare(`
        SELECT p.id, p.user_id, gp.score
        FROM game_players gp
        JOIN players p ON gp.player_id = p.id
        WHERE gp.game_id = ?
      `).all(game.id);
      
      return game;
    });
  }

  // Get games by user ID
  function getGamesByUser(userId) {
    const games = db.prepare(`
      SELECT g.*
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      JOIN players p ON gp.player_id = p.id
      WHERE p.user_id = ?
      ORDER BY g.start_time DESC
    `).all(userId);
    
    // Parse settings and get player data for each game
    return games.map(game => {
      game.settings = JSON.parse(game.settings);
      game.players = db.prepare(`
        SELECT p.id, p.user_id, gp.score
        FROM game_players gp
        JOIN players p ON gp.player_id = p.id
        WHERE gp.game_id = ?
      `).all(game.id);
      
      return game;
    });
  }

  // Decorate fastify with game model functions
  fastify.decorate('gameModel', {
    createGame,
    getGameById,
    updateGame,
    deleteGame,
    getAllGames,
    getGamesByTournament,
    getGamesByUser
  });
}

module.exports = fp(gameModelPlugin, {
  name: 'game-model',
  dependencies: ['db', 'player-model']
});