"use strict";

const fp = require('fastify-plugin');

async function gameModelPlugin(fastify) {

  const { db } = fastify;

  // CREATE GAME
  function createGame(gameData) {
    const { tournament_id, start_time, end_time, settings, players } = gameData;   
    const startTimeStr = start_time ? (typeof start_time === 'object' && start_time instanceof Date ? start_time.toISOString() : start_time) : null;    
    const endTimeStr = end_time ? (typeof end_time === 'object' && end_time instanceof Date ? end_time.toISOString() : end_time) : null;
    
    const transaction = db.transaction(() => {
      const gameResult = db.prepare(`
        INSERT INTO games (tournament_id, start_time, end_time, settings)
        VALUES (?, ?, ?, ?)
      `).run(tournament_id || null, startTimeStr, endTimeStr, JSON.stringify(settings));
      
      const gameId = gameResult.lastInsertRowid;
      for (const playerData of players) {
        const player = fastify.playerModel.getOrCreatePlayer(playerData.user_id);
        db.prepare(`
          INSERT INTO game_players (game_id, player_id, score)
          VALUES (?, ?, ?)
        `).run(gameId, player.id, playerData.score);
      }
      
      return gameId;
    });
    
    const gameId = transaction();
    return getGameById(gameId);
  }

  // GET GAME BY ID
  function getGameById(id) {
    const game = db.prepare(`
      SELECT * FROM games WHERE id = ?
    `).get(id);
    
    if (!game) return null;
    game.settings = JSON.parse(game.settings);
    game.players = db.prepare(`
      SELECT p.id, p.user_id, gp.score
      FROM game_players gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = ?
    `).all(id);
    
    return game;
  }

  // UPDATE GAME
  function updateGame(id, gameData) {
    const { tournament_id, end_time, settings } = gameData;
    const endTimeStr = end_time ? (typeof end_time === 'object' && end_time instanceof Date ? end_time.toISOString() : end_time) : null;
    
    let currentSettings;
    if (settings) currentSettings = JSON.stringify(settings);
    else {
      const existingGame = db.prepare('SELECT settings FROM games WHERE id = ?').get(id);
      if (existingGame) {
        try { currentSettings = JSON.stringify(JSON.parse(existingGame.settings));
        } catch (e) { currentSettings = '{}';}
      } else { currentSettings = '{}'; }
    }
    
    const result = db.prepare(`
      UPDATE games
      SET tournament_id = ?,
          end_time = ?,
          settings = ?
      WHERE id = ?
    `).run(tournament_id || null, endTimeStr, currentSettings, id);

    return result.changes > 0;
  }

  // DELETE GAME
  function deleteGame(id) {
    const result = db.prepare('DELETE FROM games WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // GET ALL GAMES
  function getAllGames(limit = 100, offset = 0) {
    const games = db.prepare(`
      SELECT * FROM games
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
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

  // GET GAME BY TOURNAMENT ID
  function getGamesByTournament(tournamentId) {
    const games = db.prepare(`
      SELECT * FROM games
      WHERE tournament_id = ?
      ORDER BY start_time ASC
    `).all(tournamentId);
    
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

  // GET GAMES BY USER
  function getGamesByUser(userId) {
    const games = db.prepare(`
      SELECT g.*
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      JOIN players p ON gp.player_id = p.id
      WHERE LOWER(p.user_id) = LOWER(?)
      ORDER BY g.start_time DESC
    `).all(userId);
    
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

  fastify.decorate('gameModel', { createGame, getGameById, updateGame, deleteGame, getAllGames, getGamesByTournament, getGamesByUser });

}

module.exports = fp(gameModelPlugin, { name: 'game-model', dependencies: ['db', 'player-model'] });
