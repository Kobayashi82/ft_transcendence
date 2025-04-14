"use strict";

const fp = require('fastify-plugin');

async function statsRoutes(fastify) {

  const { db } = fastify;

  // MOST WINS
  fastify.get('/stats/leaderboard/wins', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;
      
      const leaderboard = db.prepare(`
        WITH player_wins AS (
          SELECT 
            p.id as player_id,
            p.user_id,
            COUNT(*) as wins
          FROM game_players gp1
          JOIN players p ON gp1.player_id = p.id
          WHERE NOT EXISTS (
            SELECT 1 FROM game_players gp2
            WHERE gp2.game_id = gp1.game_id AND gp2.score > gp1.score
          )
          GROUP BY p.id
        )
        SELECT 
          pw.player_id,
          pw.user_id,
          pw.wins,
          (SELECT COUNT(*) FROM game_players gp WHERE gp.player_id = pw.player_id) as total_games,
          ROUND((pw.wins * 100.0 / (SELECT COUNT(*) FROM game_players gp WHERE gp.player_id = pw.player_id)), 2) as win_rate
        FROM player_wins pw
        ORDER BY wins DESC, win_rate DESC
        LIMIT ?
      `).all(limit);
      
      return { data: leaderboard };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get leaderboard' });
    }
  });

  // WIN RATE
  fastify.get('/stats/leaderboard/winrate', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 10 },
          min_games: { type: 'integer', default: 5 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;
      const minGames = parseInt(request.query.min_games) || 5;
      
      const leaderboard = db.prepare(`
        WITH player_stats AS (
          SELECT 
            p.id as player_id,
            p.user_id,
            COUNT(*) as total_games,
            SUM(CASE WHEN NOT EXISTS (
              SELECT 1 FROM game_players gp2
              WHERE gp2.game_id = gp1.game_id AND gp2.score > gp1.score
            ) THEN 1 ELSE 0 END) as wins
          FROM game_players gp1
          JOIN players p ON gp1.player_id = p.id
          GROUP BY p.id
          HAVING total_games >= ?
        )
        SELECT 
          ps.player_id,
          ps.user_id,
          ps.wins,
          ps.total_games,
          ROUND((ps.wins * 100.0 / ps.total_games), 2) as win_rate
        FROM player_stats ps
        ORDER BY win_rate DESC, total_games DESC
        LIMIT ?
      `).all(minGames, limit);
      
      return { data: leaderboard };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get leaderboard' });
    }
  });

  // TOURNAMENT WINS
  fastify.get('/stats/leaderboard/tournaments', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;
      
      const leaderboard = db.prepare(`
        SELECT 
          p.id as player_id,
          p.user_id,
          COUNT(*) as tournament_wins,
          (SELECT COUNT(*) FROM tournament_players tp WHERE tp.player_id = p.id) as total_tournaments
        FROM tournament_players tp
        JOIN players p ON tp.player_id = p.id
        WHERE tp.final_position = 1
        GROUP BY p.id
        ORDER BY tournament_wins DESC, total_tournaments ASC
        LIMIT ?
      `).all(limit);
      
      return { data: leaderboard };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get leaderboard' });
    }
  });

  // TOTAL GAMES
  fastify.get('/stats/leaderboard/totalgames', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;
      
      const leaderboard = db.prepare(`
        SELECT 
          p.id as player_id,
          p.user_id,
          COUNT(*) as total_games,
          SUM(CASE WHEN NOT EXISTS (
            SELECT 1 FROM game_players gp2
            WHERE gp2.game_id = gp1.game_id AND gp2.score > gp1.score
          ) THEN 1 ELSE 0 END) as wins
        FROM game_players gp1
        JOIN players p ON gp1.player_id = p.id
        GROUP BY p.id
        ORDER BY total_games DESC, wins DESC
        LIMIT ?
      `).all(limit);
      
      return { data: leaderboard };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get total games leaderboard' });
    }
  });

  // FASTEST WINS
  fastify.get('/stats/leaderboard/fastest', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;
      
      const leaderboard = db.prepare(`
        WITH winning_games AS (
          SELECT 
            gp1.player_id,
            g.id as game_id,
            CAST(
              (julianday(g.end_time) - julianday(g.start_time)) * 24 * 60 * 60 AS INTEGER
            ) as duration_seconds
          FROM game_players gp1
          JOIN games g ON gp1.game_id = g.id
          WHERE NOT EXISTS (
            SELECT 1 FROM game_players gp2
            WHERE gp2.game_id = gp1.game_id AND gp2.score > gp1.score
          )
          AND g.end_time IS NOT NULL
          AND g.start_time IS NOT NULL
        ),
        fastest_wins AS (
          SELECT 
            player_id,
            MIN(duration_seconds) as fastest_win
          FROM winning_games
          GROUP BY player_id
        )
        SELECT 
          p.id as player_id,
          p.user_id,
          fw.fastest_win
        FROM fastest_wins fw
        JOIN players p ON fw.player_id = p.id
        ORDER BY fw.fastest_win ASC
        LIMIT ?
      `).all(limit);
      
      return { data: leaderboard };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get fastest wins leaderboard' });
    }
  });

  // USER STATS
  fastify.get('/stats/user/:userId', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      
      const player = db.prepare('SELECT * FROM players WHERE LOWER(user_id) = LOWER(?)').get(userId);
      
      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }
      
      // Get total games and wins
      const gameStats = db.prepare(`
        SELECT 
          COUNT(*) as total_games,
          SUM(CASE WHEN NOT EXISTS (
            SELECT 1 FROM game_players gp2
            WHERE gp2.game_id = gp1.game_id AND gp2.score > gp1.score
          ) THEN 1 ELSE 0 END) as wins
        FROM game_players gp1
        WHERE player_id = ?
      `).get(player.id);
      
      const tournamentStats = db.prepare(`
        SELECT 
          COUNT(*) as total_tournaments,
          SUM(CASE WHEN final_position = 1 THEN 1 ELSE 0 END) as tournament_wins
        FROM tournament_players
        WHERE player_id = ?
      `).get(player.id);
      
      const avgScore = db.prepare(`
        SELECT AVG(score) as avg_score
        FROM game_players
        WHERE player_id = ?
      `).get(player.id).avg_score || 0;
      
      const winRate = gameStats.total_games > 0 ? (gameStats.wins * 100.0 / gameStats.total_games).toFixed(2) : 0;
      
      return {
        player_id: player.id,
        user_id: player.user_id,
        total_games: gameStats.total_games,
        wins: gameStats.wins,
        win_rate: parseFloat(winRate),
        avg_score: avgScore,
        total_tournaments: tournamentStats.total_tournaments,
        tournament_wins: tournamentStats.tournament_wins,
        recent_games: db.prepare(`
          SELECT g.id, g.start_time, g.end_time, gp.score
          FROM games g
          JOIN game_players gp ON g.id = gp.game_id
          WHERE gp.player_id = ?
          ORDER BY g.start_time DESC
          LIMIT 5
        `).all(player.id),
        recent_tournaments: db.prepare(`
          SELECT t.id, t.name, t.start_time, t.end_time, tp.final_position
          FROM tournaments t
          JOIN tournament_players tp ON t.id = tp.tournament_id
          WHERE tp.player_id = ?
          ORDER BY t.start_time DESC
          LIMIT 5
        `).all(player.id)
      };
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to get user stats' });
    }
  });

}

module.exports = fp(statsRoutes, { name: 'stats-routes', dependencies: ['db'] });
