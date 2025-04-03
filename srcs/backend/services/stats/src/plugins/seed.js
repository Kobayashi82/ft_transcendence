"use strict";

const fp = require('fastify-plugin');

async function seedPlugin(fastify, options) {
  // Datos predefinidos con nombres más realistas para un juego de Pong
  const playerNames = [
    "PongMaster", "SpeedPaddle", "RetroChamp", "BallWizard", "RallyKing",
    "PaddlePro", "PixelSmasher", "TableTitan", "ArcadeAce", "BounceMaster",
    "ServeKing", "SpinDoctor", "ReturnAce", "SliceNinja", "RallyQueen",
    "SmashChamp", "PingPro", "PongLegend", "ClassicPlayer", "TopSpin"
  ];

  const tournamentNames = [
    "Spring Pong Classic", "Summer Paddle Championship", "Fall Ball Masters", 
    "Winter Bounce Tournament", "Grand Slam Pong", "Diamond Paddle League",
    "Pixel Cup", "Retro Pong Open", "Champion's Rally", "Elite Pong Series"
  ];

  // Configuración específica para Pong
  const ballSpeedOptions = [5, 7, 10, 12, 15]; // Velocidades de bola
  const paddleSizeOptions = [60, 80, 100, 120]; // Tamaños de paleta
  const speedIncrementOptions = [0.1, 0.2, 0.3, 0.5]; // Incrementos de velocidad
  const pointsToWinOptions = [5, 7, 10, 15, 21]; // Puntos para ganar

  // Formatos de torneo
  const tournamentFormats = ["Single Elimination", "Double Elimination", "Round Robin", "Swiss System"];

  // Función para generar fechas ISO con intervalos coherentes
  function randomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
  }

  // Función para generar una fecha de inicio
  function generateStartDate() {
    const date = new Date();
    // Fechas entre los últimos 6 meses
    date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString(); // Importante: devolver string ISO
  }

  // Función para generar una fecha de fin basada en la de inicio
  function generateEndDate(startDate, minMinutes = 3, maxMinutes = 30) {
    const start = new Date(startDate);
    const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes);
    start.setMinutes(start.getMinutes() + minutes);
    return start.toISOString();
  }

  // Función para obtener un elemento aleatorio de un array
  function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Función para obtener n elementos aleatorios de un array
  function randomElements(array, n) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // Función para generar un número aleatorio entre min y max
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  // Función para limpiar la base de datos
  function clearDatabase() {
    fastify.log.info('Cleaning existing database...');
    
    // Order is important to avoid foreign key constraints
    fastify.db.exec('DELETE FROM game_players');
    fastify.db.exec('DELETE FROM tournament_players');
    fastify.db.exec('DELETE FROM games');
    fastify.db.exec('DELETE FROM tournaments');
    fastify.db.exec('DELETE FROM players');
    
    // Reset auto-increment counters
    fastify.db.exec("DELETE FROM sqlite_sequence WHERE name IN ('games', 'players', 'tournaments', 'game_players', 'tournament_players')");
    
    fastify.log.info('Database cleaned');
  }

  // Función para poblar la base de datos
  async function seedDatabase() {
    try {
      fastify.log.info('Generating test data...');
      
      // Clean database first
      clearDatabase();
      
      // Generate players with skill levels
      fastify.log.info(`Creating ${playerNames.length} players...`);
      const players = [];
      const playerSkills = {}; // For tracking skill levels
      
      for (const userId of playerNames) {
        const player = fastify.playerModel.getOrCreatePlayer(userId);
        players.push(player);
        
        // Assign a random skill level (1-100) to each player
        playerSkills[player.id] = randomInt(30, 100);
      }
      
      // Generate tournaments
      fastify.log.info(`Creating ${tournamentNames.length} tournaments...`);
      const tournaments = [];
      
      for (const name of tournamentNames) {
        // Tournament start date (between 1-6 months ago)
        const tournamentStartDate = generateStartDate();
        
        // Settings tailored for Pong
        const tournamentData = {
          name,
          start_time: tournamentStartDate, // Ya es una cadena ISO
          settings: {
            format: randomElement(tournamentFormats),
            pointsToWin: randomElement(pointsToWinOptions),
            ballSpeed: randomElement(ballSpeedOptions),
            paddleSize: randomElement(paddleSizeOptions),
            speedIncrement: randomElement(speedIncrementOptions)
          },
          // Always 4 players for tournament (easier for bracket structure)
          players: randomElements(players, 4).map(p => ({ user_id: p.user_id }))
        };
        
        const tournament = fastify.tournamentModel.createTournament(tournamentData);
        tournaments.push(tournament);
        
        // Complete tournament results (75% of tournaments are completed)
        if (Math.random() < 0.75) {
          // Get the players and sort by skill for more realistic tournament results
          // (with some randomness to avoid perfect predictability)
          const tournamentPlayers = tournament.players
            .map(player => {
              const playerId = players.find(p => p.user_id === player.user_id).id;
              const skill = playerSkills[playerId];
              // Add some randomness to skill
              const effectiveSkill = skill * (0.8 + Math.random() * 0.4);
              return { ...player, effectiveSkill };
            })
            .sort((a, b) => b.effectiveSkill - a.effectiveSkill);
          
          // Assign positions based on sorted skills
          const results = tournamentPlayers.map((player, index) => ({
            user_id: player.user_id,
            position: index + 1
          }));
          
          // Update tournament results and end date (ya tenemos tournamentStartDate como string ISO)
          const tournamentEndDate = generateEndDate(tournamentStartDate, 180, 360); // Tournaments take 3-6 hours
          fastify.tournamentModel.updateTournament(tournament.id, {
            end_time: tournamentEndDate,
            status: 'completed'
          });
          fastify.tournamentModel.updateTournamentResults(tournament.id, results);
          
          // Generate games for this tournament (semifinals and final)
          // Pasamos tournamentStartDate como string ISO
          generateTournamentGames(tournament, tournamentPlayers, tournamentStartDate);
        }
      }
      
      // Generate standalone games (not part of tournaments)
      const NUM_STANDALONE_GAMES = 100; // More games for better statistics
      fastify.log.info(`Creating ${NUM_STANDALONE_GAMES} standalone games...`);
      
      for (let i = 0; i < NUM_STANDALONE_GAMES; i++) {
        // For Pong, we'll always have 2 players
        const gamePlayers = randomElements(players, 2);
        
        // Calculate scores based on player skill levels (with randomness)
        const player1Id = gamePlayers[0].id;
        const player2Id = gamePlayers[1].id;
        const player1Skill = playerSkills[player1Id];
        const player2Skill = playerSkills[player2Id];
        
        // Points to win for this game
        const pointsToWin = randomElement(pointsToWinOptions);
        
        // Calculate scores based on skills (with randomness)
        let player1Score, player2Score;
        const skillDiff = player1Skill - player2Skill;
        const winChance = 0.5 + (skillDiff / 200); // Convert skill diff to win probability
        
        // Determine winner and scores based on win chance
        if (Math.random() < winChance) {
          // Player 1 wins
          player1Score = pointsToWin;
          player2Score = Math.max(0, pointsToWin - randomInt(1, Math.floor(pointsToWin * 0.6)));
        } else {
          // Player 2 wins
          player2Score = pointsToWin;
          player1Score = Math.max(0, pointsToWin - randomInt(1, Math.floor(pointsToWin * 0.6)));
        }
        
        // Game duration based on scores and random factor - startDate es una cadena ISO
        const startDate = generateStartDate();
        
        // Calculate a realistic game duration (higher scores = longer games)
        const totalPoints = player1Score + player2Score;
        const minDuration = totalPoints * 0.5; // At least 30 seconds per point
        const maxDuration = totalPoints * 2;  // At most 2 minutes per point
        const gameMinutes = minDuration + Math.random() * (maxDuration - minDuration);
        
        // Create end date based on start date
        const parsedStartDate = new Date(startDate);
        const endDate = new Date(parsedStartDate);
        endDate.setMinutes(endDate.getMinutes() + gameMinutes);
        const endDateISO = endDate.toISOString();
        
        // Game settings
        const gameData = {
          tournament_id: null, // Not part of a tournament
          start_time: startDate,
          end_time: endDateISO,
          settings: {
            ballSpeed: randomElement(ballSpeedOptions),
            paddleSize: randomElement(paddleSizeOptions),
            speedIncrement: randomElement(speedIncrementOptions),
            pointsToWin: pointsToWin
          },
          players: [
            { user_id: gamePlayers[0].user_id, score: player1Score },
            { user_id: gamePlayers[1].user_id, score: player2Score }
          ]
        };
        
        fastify.gameModel.createGame(gameData);
      }
      
      // Create some very fast games for the fastest wins leaderboard
      const NUM_FAST_GAMES = 15;
      fastify.log.info(`Creating ${NUM_FAST_GAMES} fast games for leaderboard...`);
      
      for (let i = 0; i < NUM_FAST_GAMES; i++) {
        // Select 2 players with a big skill gap for fast games
        const players_sorted = [...players].sort(() => Math.random() - 0.5);
        const player1 = players_sorted[0];
        const player2 = players_sorted[1];
        
        // Make it a quick win - startDate es una cadena ISO
        const startDate = generateStartDate();
        
        // Parse startDate para manipularlo
        const parsedStartDate = new Date(startDate);
        const endDate = new Date(parsedStartDate);
        
        // Fast games between 30-90 seconds
        endDate.setSeconds(endDate.getSeconds() + randomInt(30, 90));
        
        // Convert to ISO string
        const endDateISO = endDate.toISOString();
        
        // Game settings - faster ball, smaller paddles
        const gameData = {
          tournament_id: null,
          start_time: startDate,
          end_time: endDateISO,
          settings: {
            ballSpeed: 15, // Max speed
            paddleSize: 60, // Small paddles
            speedIncrement: 0.5, // Fast increase
            pointsToWin: 5 // Few points to win
          },
          players: [
            { user_id: player1.user_id, score: 5 },
            { user_id: player2.user_id, score: randomInt(0, 2) }
          ]
        };
        
        fastify.gameModel.createGame(gameData);
      }
      
      // Create some players with many games for the most games leaderboard
      const HIGH_VOLUME_PLAYERS = 5;
      const GAMES_PER_PLAYER = 20;
      fastify.log.info(`Creating additional games for ${HIGH_VOLUME_PLAYERS} high-volume players...`);
      
      // Pick some players to have lots of games
      const highVolumePlayerList = randomElements(players, HIGH_VOLUME_PLAYERS);
      
      for (const player of highVolumePlayerList) {
        for (let i = 0; i < GAMES_PER_PLAYER; i++) {
          // Find an opponent
          const opponent = randomElements(
            players.filter(p => p.id !== player.id), 
            1
          )[0];
          
          // Set up game - startDate es una cadena ISO
          const startDate = generateStartDate();
          // endDate ya es una cadena ISO
          const endDate = generateEndDate(startDate);
          
          // Game settings
          const pointsToWin = randomElement(pointsToWinOptions);
          const playerScore = Math.random() < 0.6 ? pointsToWin : randomInt(0, pointsToWin - 1);
          const opponentScore = playerScore === pointsToWin ? randomInt(0, pointsToWin - 1) : pointsToWin;
          
          const gameData = {
            tournament_id: null,
            start_time: startDate,
            end_time: endDate,
            settings: {
              ballSpeed: randomElement(ballSpeedOptions),
              paddleSize: randomElement(paddleSizeOptions),
              speedIncrement: randomElement(speedIncrementOptions),
              pointsToWin: pointsToWin
            },
            players: [
              { user_id: player.user_id, score: playerScore },
              { user_id: opponent.user_id, score: opponentScore }
            ]
          };
          
          fastify.gameModel.createGame(gameData);
        }
      }
      
      // Function to generate tournament games
      function generateTournamentGames(tournament, players, tournamentDate) {
        // Ensure tournamentDate is parsed as Date object from ISO string
        const tournStart = new Date(tournamentDate);
        
        // Generate semifinals
        const semifinal1Date = new Date(tournStart);
        semifinal1Date.setMinutes(semifinal1Date.getMinutes() + 30); // 30 minutes after tournament start
        
        const semifinal2Date = new Date(semifinal1Date);
        semifinal2Date.setMinutes(semifinal2Date.getMinutes() + 45); // 45 minutes after first semifinal
        
        // Final starts after both semifinals
        const finalDate = new Date(semifinal2Date);
        finalDate.setMinutes(finalDate.getMinutes() + 60); // 1 hour after second semifinal
        
        // Convert all dates to ISO strings
        const sf1Start = semifinal1Date.toISOString();
        const sf1End = generateEndDate(sf1Start);
        
        const sf2Start = semifinal2Date.toISOString();
        const sf2End = generateEndDate(sf2Start);
        
        const finalStart = finalDate.toISOString();
        const finalEnd = generateEndDate(finalStart);
        
        // Semifinal 1: 1st vs 4th
        const sf1Player1 = players[0]; // 1st seeded player
        const sf1Player2 = players[3]; // 4th seeded player
        
        // Semifinal 2: 2nd vs 3rd
        const sf2Player1 = players[1]; // 2nd seeded player
        const sf2Player2 = players[2]; // 3rd seeded player
        
        // Points to win
        const pointsToWin = tournament.settings.pointsToWin || 7;
        
        // Generate scores based on skills
        const sf1Player1Score = sf1Player1.effectiveSkill > sf1Player2.effectiveSkill ? pointsToWin : randomInt(0, pointsToWin - 1);
        const sf1Player2Score = sf1Player1Score === pointsToWin ? randomInt(0, pointsToWin - 1) : pointsToWin;
        
        const sf2Player1Score = sf2Player1.effectiveSkill > sf2Player2.effectiveSkill ? pointsToWin : randomInt(0, pointsToWin - 1);
        const sf2Player2Score = sf2Player1Score === pointsToWin ? randomInt(0, pointsToWin - 1) : pointsToWin;
        
        // Create semifinal 1
        const semifinal1Data = {
          tournament_id: tournament.id,
          start_time: sf1Start,
          end_time: sf1End,
          settings: tournament.settings,
          players: [
            { user_id: sf1Player1.user_id, score: sf1Player1Score },
            { user_id: sf1Player2.user_id, score: sf1Player2Score }
          ]
        };
        
        fastify.gameModel.createGame(semifinal1Data);
        
        // Create semifinal 2
        const semifinal2Data = {
          tournament_id: tournament.id,
          start_time: sf2Start,
          end_time: sf2End,
          settings: tournament.settings,
          players: [
            { user_id: sf2Player1.user_id, score: sf2Player1Score },
            { user_id: sf2Player2.user_id, score: sf2Player2Score }
          ]
        };
        
        fastify.gameModel.createGame(semifinal2Data);
        
        // Determine finalists (winners of semifinals)
        const finalist1 = sf1Player1Score > sf1Player2Score ? sf1Player1 : sf1Player2;
        const finalist2 = sf2Player1Score > sf2Player2Score ? sf2Player1 : sf2Player2;
        
        // Final scores should match tournament results
        let final1Score, final2Score;
        
        if (finalist1.user_id === players[0].user_id || finalist2.user_id === players[0].user_id) {
          // 1st place player is in final, so they should win
          if (finalist1.user_id === players[0].user_id) {
            final1Score = pointsToWin;
            final2Score = randomInt(0, pointsToWin - 1);
          } else {
            final1Score = randomInt(0, pointsToWin - 1);
            final2Score = pointsToWin;
          }
        } else {
          // Neither finalist is 1st place (unusual but possible)
          // Determine winner based on their positions
          const finalist1Position = players.findIndex(p => p.user_id === finalist1.user_id);
          const finalist2Position = players.findIndex(p => p.user_id === finalist2.user_id);
          
          if (finalist1Position < finalist2Position) {
            final1Score = pointsToWin;
            final2Score = randomInt(0, pointsToWin - 1);
          } else {
            final1Score = randomInt(0, pointsToWin - 1);
            final2Score = pointsToWin;
          }
        }
        
        // Create final
        const finalData = {
          tournament_id: tournament.id,
          start_time: finalStart,
          end_time: finalEnd,
          settings: tournament.settings,
          players: [
            { user_id: finalist1.user_id, score: final1Score },
            { user_id: finalist2.user_id, score: final2Score }
          ]
        };
        
        fastify.gameModel.createGame(finalData);
      }
      
      // Get sample data for testing
      const samplePlayer = players[0];
      const sampleTournament = tournaments[0];
      
      // Get a random game that is not part of a tournament
      const sampleGame = fastify.db.prepare(`
        SELECT games.id FROM games WHERE tournament_id IS NULL LIMIT 1
      `).get();
      
      fastify.log.info('\nSample data for testing:');
      fastify.log.info(`Player ID: ${samplePlayer.id}, User ID: ${samplePlayer.user_id}`);
      fastify.log.info(`Tournament ID: ${sampleTournament.id}, Name: ${sampleTournament.name}`);
      fastify.log.info(`Game ID: ${sampleGame ? sampleGame.id : 'None'}`);
      
      fastify.log.info('\nDatabase successfully populated!');
      
      return {
        samplePlayerId: samplePlayer.id,
        samplePlayerUserId: samplePlayer.user_id,
        sampleTournamentId: sampleTournament.id, 
        sampleGameId: sampleGame ? sampleGame.id : null
      };
    } catch (err) {
      fastify.log.error('Error populating database:', err);
      throw err;
    }
  }

  // Decorate fastify with the seed function
  fastify.decorate('seed', seedDatabase);
}

module.exports = fp(seedPlugin, {
  name: 'seed',
  dependencies: ['db', 'player-model', 'game-model', 'tournament-model']
});