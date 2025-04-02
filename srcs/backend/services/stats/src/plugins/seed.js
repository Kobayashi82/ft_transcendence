"use strict";

const fp = require('fastify-plugin');

async function seedPlugin(fastify, options) {
  // Datos predefinidos
  const playerNames = [
    "player1", "player2", "player3", "player4", "player5",
    "player6", "player7", "player8", "player9", "player10",
    "player11", "player12", "player13", "player14", "player15"
  ];

  const tournamentNames = [
    "Spring Tournament", "Summer Classic", "Fall Championship", "Winter Cup",
    "Grand Masters", "Diamond League"
  ];

  const gameTypes = ["chess", "checkers", "go", "poker", "dominoes"];
  const timeControls = ["blitz", "rapid", "classical"];

  // Función para generar fechas ISO
  function randomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
  }

  // Función para obtener una fecha reciente
  function recentDate() {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString();
  }

  // Función para obtener una fecha pasada
  function pastDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(Math.random() * 12));
    return date.toISOString();
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
    fastify.log.info('Limpiando base de datos existente...');
    
    // Orden importante para evitar problemas con claves foráneas
    fastify.db.exec('DELETE FROM game_players');
    fastify.db.exec('DELETE FROM tournament_players');
    fastify.db.exec('DELETE FROM games');
    fastify.db.exec('DELETE FROM tournaments');
    fastify.db.exec('DELETE FROM players');
    
    // Reset auto-increment counters - corregido para usar comillas simples
    fastify.db.exec("DELETE FROM sqlite_sequence WHERE name IN ('games', 'players', 'tournaments', 'game_players', 'tournament_players')");
    
    fastify.log.info('Base de datos limpiada');
  }

  // Función para poblar la base de datos
  async function seedDatabase() {
    try {
      fastify.log.info('Generando datos de prueba...');
      
      // Limpia la base de datos primero
      clearDatabase();
      
      // Genera jugadores
      fastify.log.info(`Creando ${playerNames.length} jugadores...`);
      const players = [];
      for (const userId of playerNames) {
        const player = fastify.playerModel.getOrCreatePlayer(userId);
        players.push(player);
      }
      
      // Genera torneos
      fastify.log.info(`Creando ${tournamentNames.length} torneos...`);
      const tournaments = [];
      for (const name of tournamentNames) {
        const tournamentData = {
          name,
          start_time: pastDate(),
          settings: {
            rounds: randomInt(3, 10),
            maxPlayers: randomInt(8, 32),
            gameType: randomElement(gameTypes),
            timeControl: randomElement(timeControls),
            isRated: Math.random() > 0.5
          },
          players: randomElements(players, randomInt(8, Math.min(12, players.length)))
            .map(p => ({ user_id: p.user_id }))
        };
        
        const tournament = fastify.tournamentModel.createTournament(tournamentData);
        tournaments.push(tournament);
        
        // Para algunos torneos, completa los resultados
        if (Math.random() < 0.75) {
          const positions = Array.from({ length: tournament.players.length }, (_, i) => i + 1);
          positions.sort(() => 0.5 - Math.random()); // mezcla las posiciones
          
          const results = tournament.players.map((player, index) => ({
            user_id: player.user_id,
            position: positions[index]
          }));
          
          // Actualiza resultados del torneo
          fastify.tournamentModel.updateTournamentResults(tournament.id, results);
        }
      }
      
      // Genera juegos
      const NUM_GAMES = 20;
      fastify.log.info(`Creando ${NUM_GAMES} juegos...`);
      const games = [];
      for (let i = 0; i < NUM_GAMES; i++) {
        // Selecciona 2-4 jugadores aleatorios
        const numPlayers = randomInt(2, 4);
        const gamePlayers = randomElements(players, numPlayers).map(p => ({
          user_id: p.user_id,
          score: randomInt(0, 100)
        }));
        
        // Selecciona un torneo de forma aleatoria (25% de probabilidad)
        const tournamentId = Math.random() < 0.25 && tournaments.length > 0
          ? randomElement(tournaments).id
          : null;
        
        const gameData = {
          tournament_id: tournamentId,
          start_time: pastDate(),
          end_time: recentDate(),
          settings: {
            gameType: randomElement(gameTypes),
            timeControl: randomElement(timeControls),
            isRated: Math.random() > 0.5
          },
          players: gamePlayers
        };
        
        const game = fastify.gameModel.createGame(gameData);
        games.push(game);
      }
      
      // Muestra datos de muestra
      const samplePlayer = players[0];
      const sampleTournament = tournaments[0];
      const sampleGame = games[0];
      
      fastify.log.info('\nDatos de muestra para pruebas:');
      fastify.log.info(`Player ID: ${samplePlayer.id}, User ID: ${samplePlayer.user_id}`);
      fastify.log.info(`Tournament ID: ${sampleTournament.id}, Name: ${sampleTournament.name}`);
      fastify.log.info(`Game ID: ${sampleGame.id}`);
      
      fastify.log.info('\nBase de datos rellenada con éxito!');
      
      return {
        samplePlayerId: samplePlayer.id,
        samplePlayerUserId: samplePlayer.user_id,
        sampleTournamentId: sampleTournament.id, 
        sampleGameId: sampleGame.id
      };
    } catch (err) {
      fastify.log.error('Error al rellenar la base de datos:', err);
      throw err;
    }
  }

  // Decorar fastify con la función de sembrado
  fastify.decorate('seed', seedDatabase);
}

module.exports = fp(seedPlugin, {
  name: 'seed',
  dependencies: ['db', 'player-model', 'game-model', 'tournament-model']
});