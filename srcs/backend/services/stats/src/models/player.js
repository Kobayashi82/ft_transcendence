// models/player.js
const fp = require('fastify-plugin');

async function playerModelPlugin(fastify, options) {
  const { db } = fastify;

  // Get or create a player by user_id
  function getOrCreatePlayer(userId) {
    const player = db.prepare('SELECT * FROM players WHERE user_id = ?').get(userId);
    
    if (player) {
      return player;
    }

    const result = db.prepare('INSERT INTO players (user_id) VALUES (?)').run(userId);
    return {
      id: result.lastInsertRowid,
      user_id: userId
    };
  }

  // Get player by ID
  function getPlayerById(id) {
    return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  }

  // Get all players
  function getAllPlayers() {
    return db.prepare('SELECT * FROM players').all();
  }

  // Get all games for a specific player
  function getPlayerGames(playerId) {
    return db.prepare(`
      SELECT g.*, gp.score
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE gp.player_id = ?
      ORDER BY g.start_time DESC
    `).all(playerId);
  }

  // Get all tournaments for a specific player
  function getPlayerTournaments(playerId) {
    return db.prepare(`
      SELECT t.*, tp.final_position
      FROM tournaments t
      JOIN tournament_players tp ON t.id = tp.tournament_id
      WHERE tp.player_id = ?
      ORDER BY t.start_time DESC
    `).all(playerId);
  }

  // Get player statistics
  function getPlayerStats(playerId) {
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_players WHERE player_id = ?').get(playerId).count;
    const totalTournaments = db.prepare('SELECT COUNT(*) as count FROM tournament_players WHERE player_id = ?').get(playerId).count;
    
    const wins = db.prepare(`
      SELECT COUNT(*) as count 
      FROM game_players gp1 
      WHERE player_id = ? 
      AND NOT EXISTS (
        SELECT 1 FROM game_players gp2 
        WHERE gp2.game_id = gp1.game_id 
        AND gp2.score > gp1.score
      )
    `).get(playerId).count;
    
    const tournamentWins = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tournament_players 
      WHERE player_id = ? AND final_position = 1
    `).get(playerId).count;
    
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