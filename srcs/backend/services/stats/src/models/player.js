// models/player.js
const fp = require('fastify-plugin');

async function playerModelPlugin(fastify, options) {
  const { db } = fastify;

  // Get or create a player by user_id (case-insensitive)
  function getOrCreatePlayer(userId) {
    // Trim the user ID but preserve its original case
    const trimmedUserId = userId ? String(userId).trim() : null;
    
    if (!trimmedUserId) {
      throw new Error('User ID is required');
    }
    
    // Search for player case-insensitively
    const player = db.prepare(`
      SELECT * FROM players 
      WHERE LOWER(user_id) = LOWER(?)
    `).get(trimmedUserId);
    
    if (player) {
      return player;
    }

    // Create player with the original case
    const result = db.prepare('INSERT INTO players (user_id) VALUES (?)').run(trimmedUserId);
    return {
      id: result.lastInsertRowid,
      user_id: trimmedUserId
    };
  }

  // Get player by ID
  function getPlayerById(id) {
    // Ensure id is a number
    const playerId = parseInt(id, 10);
    if (isNaN(playerId)) {
      return null;
    }
    
    return db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  }

  // Get all players
  function getAllPlayers() {
    return db.prepare('SELECT * FROM players').all();
  }

  // Get all games for a specific player
  function getPlayerGames(playerId) {
    // Ensure playerId is a number
    const playerIdNum = parseInt(playerId, 10);
    if (isNaN(playerIdNum)) {
      return [];
    }
    
    return db.prepare(`
      SELECT g.*, gp.score
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE gp.player_id = ?
      ORDER BY g.start_time DESC
    `).all(playerIdNum);
  }

  // Get all tournaments for a specific player
  function getPlayerTournaments(playerId) {
    // Ensure playerId is a number
    const playerIdNum = parseInt(playerId, 10);
    if (isNaN(playerIdNum)) {
      return [];
    }
    
    return db.prepare(`
      SELECT t.*, tp.final_position
      FROM tournaments t
      JOIN tournament_players tp ON t.id = tp.tournament_id
      WHERE tp.player_id = ?
      ORDER BY t.start_time DESC
    `).all(playerIdNum);
  }

  // Get player statistics
  function getPlayerStats(playerId) {
    // Ensure playerId is a number
    const playerIdNum = parseInt(playerId, 10);
    if (isNaN(playerIdNum)) {
      return {
        totalGames: 0,
        totalTournaments: 0,
        wins: 0,
        tournamentWins: 0,
        winRate: 0
      };
    }
    
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_players WHERE player_id = ?').get(playerIdNum).count;
    const totalTournaments = db.prepare('SELECT COUNT(*) as count FROM tournament_players WHERE player_id = ?').get(playerIdNum).count;
    
    const wins = db.prepare(`
      SELECT COUNT(*) as count 
      FROM game_players gp1 
      WHERE player_id = ? 
      AND NOT EXISTS (
        SELECT 1 FROM game_players gp2 
        WHERE gp2.game_id = gp1.game_id 
        AND gp2.score > gp1.score
      )
    `).get(playerIdNum).count;
    
    const tournamentWins = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tournament_players 
      WHERE player_id = ? AND final_position = 1
    `).get(playerIdNum).count;
    
    return {
      totalGames,
      totalTournaments,
      wins,
      tournamentWins,
      winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0
    };
  }

  // Add model functions to fastify instance
  fastify.decorate('playerModel', {
    getOrCreatePlayer,
    getPlayerById,
    getAllPlayers,
    getPlayerGames,
    getPlayerTournaments,
    getPlayerStats
  });
}

module.exports = fp(playerModelPlugin, {
  name: 'player-model',
  dependencies: ['db']
});