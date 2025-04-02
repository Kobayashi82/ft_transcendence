// models/tournament.js
const fp = require('fastify-plugin');

async function tournamentModelPlugin(fastify, options) {
  const { db } = fastify;

  // Create a new tournament
  function createTournament(tournamentData) {
    const { name, start_time, settings, players } = tournamentData;
    
    // Start a database transaction
    const transaction = db.transaction(() => {
      // Insert tournament
      const tournamentResult = db.prepare(`
        INSERT INTO tournaments (name, start_time, settings, status)
        VALUES (?, ?, ?, ?)
      `).run(
        name,
        start_time,
        JSON.stringify(settings),
        'pending'
      );
      
      const tournamentId = tournamentResult.lastInsertRowid;
      
      // Insert player data if provided
      if (players && players.length > 0) {
        for (const playerData of players) {
          const player = fastify.playerModel.getOrCreatePlayer(playerData.user_id);
          
          db.prepare(`
            INSERT INTO tournament_players (tournament_id, player_id)
            VALUES (?, ?)
          `).run(tournamentId, player.id);
        }
      }
      
      return tournamentId;
    });
    
    // Execute the transaction
    const tournamentId = transaction();
    
    // Return the created tournament
    return getTournamentById(tournamentId);
  }

  // Get tournament by ID
  function getTournamentById(id) {
    const tournament = db.prepare(`
      SELECT * FROM tournaments WHERE id = ?
    `).get(id);
    
    if (!tournament) {
      return null;
    }
    
    // Parse the settings JSON
    tournament.settings = JSON.parse(tournament.settings);
    
    // Get players for this tournament
    tournament.players = db.prepare(`
      SELECT p.id, p.user_id, tp.final_position
      FROM tournament_players tp
      JOIN players p ON tp.player_id = p.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.final_position NULLS LAST, p.id
    `).all(id);
    
    // Get games for this tournament
    tournament.games = fastify.gameModel.getGamesByTournament(id);
    
    return tournament;
  }

  // Update a tournament
  function updateTournament(id, tournamentData) {
    const { name, end_time, settings, status } = tournamentData;
    
    const result = db.prepare(`
      UPDATE tournaments
      SET name = COALESCE(?, name),
          end_time = ?,
          settings = COALESCE(?, settings),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name,
      end_time,
      settings ? JSON.stringify(settings) : null,
      status,
      id
    );
    
    return result.changes > 0;
  }

  // Delete a tournament
  function deleteTournament(id) {
    const result = db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Get all tournaments
  function getAllTournaments(limit = 100, offset = 0) {
    const tournaments = db.prepare(`
      SELECT * FROM tournaments
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    // Parse settings and get player data for each tournament
    return tournaments.map(tournament => {
      tournament.settings = JSON.parse(tournament.settings);
      tournament.players = db.prepare(`
        SELECT p.id, p.user_id, tp.final_position
        FROM tournament_players tp
        JOIN players p ON tp.player_id = p.id
        WHERE tp.tournament_id = ?
        ORDER BY tp.final_position NULLS LAST, p.id
      `).all(tournament.id);
      
      return tournament;
    });
  }

  // Get tournaments by user ID
  function getTournamentsByUser(userId) {
    const tournaments = db.prepare(`
      SELECT t.*
      FROM tournaments t
      JOIN tournament_players tp ON t.id = tp.tournament_id
      JOIN players p ON tp.player_id = p.id
      WHERE p.user_id = ?
      ORDER BY t.start_time DESC
    `).all(userId);
    
    // Parse settings and get player data for each tournament
    return tournaments.map(tournament => {
      tournament.settings = JSON.parse(tournament.settings);
      tournament.players = db.prepare(`
        SELECT p.id, p.user_id, tp.final_position
        FROM tournament_players tp
        JOIN players p ON tp.player_id = p.id
        WHERE tp.tournament_id = ?
        ORDER BY tp.final_position NULLS LAST, p.id
      `).all(tournament.id);
      
      return tournament;
    });
  }

  // Add player to tournament
  function addPlayerToTournament(tournamentId, userId) {
    const player = fastify.playerModel.getOrCreatePlayer(userId);
    
    try {
      db.prepare(`
        INSERT INTO tournament_players (tournament_id, player_id)
        VALUES (?, ?)
      `).run(tournamentId, player.id);
      
      return true;
    } catch (err) {
      fastify.log.error('Error adding player to tournament:', err);
      return false;
    }
  }

  // Update tournament results
  function updateTournamentResults(tournamentId, results) {
    const transaction = db.transaction(() => {
      for (const result of results) {
        db.prepare(`
          UPDATE tournament_players
          SET final_position = ?
          WHERE tournament_id = ? AND player_id = (
            SELECT id FROM players WHERE user_id = ?
          )
        `).run(result.position, tournamentId, result.user_id);
      }
      
      // Update tournament status to completed
      db.prepare(`
        UPDATE tournaments
        SET status = 'completed', end_time = CURRENT_TIMESTAMP
        WHERE id = ? AND end_time IS NULL
      `).run(tournamentId);
    });
    
    try {
      transaction();
      return true;
    } catch (err) {
      fastify.log.error('Error updating tournament results:', err);
      return false;
    }
  }

  // Decorate fastify with tournament model functions
  fastify.decorate('tournamentModel', {
    createTournament,
    getTournamentById,
    updateTournament,
    deleteTournament,
    getAllTournaments,
    getTournamentsByUser,
    addPlayerToTournament,
    updateTournamentResults
  });
}

module.exports = fp(tournamentModelPlugin, {
  name: 'tournament-model',
  dependencies: ['db', 'player-model', 'game-model']
});