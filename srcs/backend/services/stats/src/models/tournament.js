"use strict";

const fp = require('fastify-plugin');

async function tournamentModelPlugin(fastify, options) {

  const { db } = fastify;

  // CREATE TOURNAMENT
  function createTournament(tournamentData) {
    const { name, start_time, settings, players } = tournamentData;

    const startTimeStr = start_time ? (typeof start_time === 'object' && start_time instanceof Date ? start_time.toISOString() : start_time) : null;
    const transaction = db.transaction(() => {
      const tournamentResult = db.prepare(`
        INSERT INTO tournaments (name, start_time, settings, status)
        VALUES (?, ?, ?, ?)
      `).run(name, startTimeStr, JSON.stringify(settings), 'pending');
      
      const tournamentId = tournamentResult.lastInsertRowid;
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
    
    const tournamentId = transaction();
    return getTournamentById(tournamentId);
  }

  // GET TOURNAMENT BY ID
  function getTournamentById(id) {
    const tournament = db.prepare(`
      SELECT * FROM tournaments WHERE id = ?
    `).get(id);
    
    if (!tournament) return null;
    
    tournament.settings = JSON.parse(tournament.settings);
    tournament.players = db.prepare(`
      SELECT p.id, p.user_id, tp.final_position
      FROM tournament_players tp
      JOIN players p ON tp.player_id = p.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.final_position NULLS LAST, p.id
    `).all(id);
    
    tournament.games = fastify.gameModel.getGamesByTournament(id);
    return tournament;
  }

  // UPDATE TOURNAMENT
  function updateTournament(id, tournamentData) {
    const { name, end_time, settings, status } = tournamentData;
    
    const endTimeStr = end_time ? (typeof end_time === 'object' && end_time instanceof Date ? end_time.toISOString() : end_time) : null;
    const settingsStr = settings ? JSON.stringify(settings) : null;
    const result = db.prepare(`
      UPDATE tournaments
      SET name = COALESCE(?, name),
          end_time = ?,
          settings = COALESCE(?, settings),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, endTimeStr, settingsStr, status, id);

    return result.changes > 0;
  }

  // DELETE TOURNAMENT
  function deleteTournament(id) {
    const result = db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // GET ALL TOURNAMENTS
  function getAllTournaments(limit = 100, offset = 0) {
    const tournaments = db.prepare(`
      SELECT * FROM tournaments
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
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

  // GET TOURNAMENT BY USER
  function getTournamentsByUser(userId) {
    const tournaments = db.prepare(`
      SELECT t.*
      FROM tournaments t
      JOIN tournament_players tp ON t.id = tp.tournament_id
      JOIN players p ON tp.player_id = p.id
      WHERE LOWER(p.user_id) = LOWER(?)
      ORDER BY t.start_time DESC
    `).all(userId);
    
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

  // ADD PLAYER TO TOURNAMENT
  function addPlayerToTournament(tournamentId, userId) {
    const player = fastify.playerModel.getOrCreatePlayer(userId);
    
    try {
      db.prepare(`
        INSERT INTO tournament_players (tournament_id, player_id)
        VALUES (?, ?)
      `).run(tournamentId, player.id);
      
      return true;
    } catch (err) { return false; }
  }

  // UPDATE TOURNAMENT RESULTS
  function updateTournamentResults(tournamentId, results) {
    const transaction = db.transaction(() => {
      for (const result of results) {
        db.prepare(`
          UPDATE tournament_players
          SET final_position = ?
          WHERE tournament_id = ? AND player_id = (
            SELECT id FROM players WHERE LOWER(user_id) = LOWER(?)
          )
        `).run(result.position, tournamentId, result.user_id);
      }

      const currentDate = new Date().toISOString(); 
      db.prepare(`
        UPDATE tournaments
        SET status = 'completed', end_time = ?
        WHERE id = ? AND end_time IS NULL
      `).run(currentDate, tournamentId);
    });
    
    try { transaction(); return true; }
    catch (err) { return false; }
  }

  fastify.decorate('tournamentModel', { createTournament, getTournamentById, updateTournament, deleteTournament, getAllTournaments, getTournamentsByUser, addPlayerToTournament, updateTournamentResults });

}

module.exports = fp(tournamentModelPlugin, { name: 'tournament-model', dependencies: ['db', 'player-model', 'game-model'] });
