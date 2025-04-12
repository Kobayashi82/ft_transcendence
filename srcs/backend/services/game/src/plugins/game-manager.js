"use strict";

const config = require('../config');
const PongGame = require('./game-logic');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const aiNotifier = require('./ai-notifier'); // Importar el notificador de IA

// Importamos tournamentManager pero lo haremos después de exportar la instancia
let tournamentManager;

class GameManager {
  constructor() {
    this.games = new Map();
    this.clients = new Map();
    this.players = new Map();
    this.tournaments = new Map();
    
    this.updateGames = this.updateGames.bind(this);
    this.cleanupInactiveGames = this.cleanupInactiveGames.bind(this);
    this.sendGameResultsToStats = this.sendGameResultsToStats.bind(this);
    
    this.updateGamesInterval = setInterval(this.updateGames, 16); // 60 fps
    this.cleanupGamesInterval = setInterval(this.cleanupInactiveGames, 60000);
  }

  // CREATE GAME
  createGame(settings) {
    const gameId = uuidv4();
    const game = new PongGame(settings);
    
    // Importante: registrar TIEMPO EXACTO de inicio para estadísticas precisas
    const exactStartTime = Date.now();
    
    // Guardar metadata CON la instancia de juego como propiedad game
    this.games.set(gameId, {
      game: game, // Mantener la instancia del juego como una propiedad
      id: gameId,
      startTime: exactStartTime,
      finishTime: null,  // Se establecerá cuando termine el juego
      clients: new Set(),
      players: {},
      spectators: new Set(),
      disconnectedPlayers: new Map(), // Tracking disconnected players and when they disconnected
      lastBroadcast: Date.now(),
      lastActivity: Date.now(),
      sentToStats: false // Flag para evitar duplicación en envío a stats
    });
    
    console.log(`Game created: ${gameId} at ${new Date(exactStartTime).toISOString()}`);
    console.log(`Game settings: ${JSON.stringify(settings)}`);
    
    // The game will be updated by the global update loop
    
    return gameId;
  }

  // FINISH GAME - Registrar tiempo exacto al finalizar
  finishGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    // Marcar el tiempo exacto de finalización
    const exactFinishTime = Date.now();
    game.finishTime = exactFinishTime;
    
    console.log(`Game ${gameId} finished at ${new Date(exactFinishTime).toISOString()}`);
    console.log(`Game duration: ${(exactFinishTime - game.startTime) / 1000} seconds`);
    
    // Establecer el estado como finalizado si no está ya en 'next' (para torneos)
    if (game.gameState !== 'next') {
      game.gameState = 'finished';
    }
    
    // Enviar resultados a estadísticas
    setTimeout(() => {
      this.sendGameResultsToStats(gameId);
    }, 500); // Pequeño delay para asegurar que todo esté registrado
    
    return true;
  }

  // GET GAME
  getGame(gameId) {
    const gameEntry = this.games.get(gameId);
    return gameEntry ? gameEntry.game : null;
  }
  
  // GET GAME STATE - Modificado para incluir la bandera isAI en la información del jugador
  getGameState(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return null;
    
    // Obtener el estado básico del juego
    const state = gameEntry.game.getState();
    
    // Añadir las banderas de IA a los jugadores
    if (gameEntry.game.player1IsAI) {
      state.player1.isAI = true;
    }
    
    if (gameEntry.game.player2IsAI) {
      state.player2.isAI = true;
    }
    
    return state;
  }

  // ADD PLAYER - Modificado para notificar a la IA cuando se asigna un jugador IA
  addPlayer(gameId, playerName, playerNumber) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    gameEntry.game.setPlayer(playerNumber, playerName);
    this.players.set(playerName, { gameId, playerNumber });
    gameEntry.lastActivity = Date.now();
    
    // Verificar si el jugador es una IA (por el nombre)
    const isAI = this.isAIPlayer(playerName);
    if (isAI) {
      // Marcar el jugador como IA en el estado del juego para el frontend
      gameEntry.game['player' + playerNumber + 'IsAI'] = true;
      
      console.log(`Jugador ${playerNumber} (${playerName}) es una IA - Notificando a la IA`);
      // Notificar a la IA sobre el juego asignado (sin necesidad de bloquear)
      aiNotifier.notifyAI(gameId, playerName, playerNumber)
        .then(success => {
          if (success) {
            console.log(`IA ${playerName} notificada exitosamente sobre el juego ${gameId}`);
          } else {
            console.error(`Error al notificar a la IA ${playerName} sobre el juego ${gameId}`);
          }
        })
        .catch(error => {
          console.error(`Excepción al notificar a la IA: ${error.message}`);
        });
    }
    
    return true;
  }
  
  // Método auxiliar para verificar si un jugador es IA basado en su nombre
  isAIPlayer(playerName) {
    // Verificar si el nombre del jugador coincide con alguna IA conocida
    const aiNames = config.ai?.opponents || [];
    return aiNames.includes(playerName);
  }

  // PLAYER PLAYING
  isPlayerInGame(playerName) {
    return this.players.has(playerName);
  }
  
  // Get client information
  getClientInfo(clientId) {
    return this.clients.get(clientId);
  }
  
  // Check if game has disconnected players
  hasDisconnectedPlayers(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;

    return gameEntry.disconnectedPlayers.size > 0;
  }
  
  // Register a WebSocket client
  registerClient(gameId, clientId, ws, playerName = null) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    gameEntry.clients.add(clientId);
    
    this.clients.set(clientId, { ws, gameId, playerName});
    
    // If this is a reconnecting player, remove from disconnected players
    if (playerName && gameEntry.disconnectedPlayers.has(playerName)) {
      gameEntry.disconnectedPlayers.delete(playerName);
      
      // If game was paused due to disconnection and all players are back, resume it
      if (gameEntry.game.gameState === 'paused' && !this.hasDisconnectedPlayers(gameId)) {
        gameEntry.game.resume();
        this.broadcastGameState(gameId);
      }
    }
    
    console.log(`Client ${clientId} registered to game ${gameId}`);
    return true;
  }
  
  // Unregister a client when disconnected
  unregisterClient(clientId) {
    const clientEntry = this.clients.get(clientId);
    if (!clientEntry) return;
    
    const gameEntry = this.games.get(clientEntry.gameId);
    if (gameEntry) {
      gameEntry.clients.delete(clientId);
      
      if (clientEntry.playerName) {
        // Agregar a la lista de jugadores desconectados con timestamp
        gameEntry.disconnectedPlayers.set(clientEntry.playerName, Date.now());
        
        // Liberar al jugador del mapa de jugadores si el juego no está en curso
        if (!['playing', 'paused', 'waiting'].includes(gameEntry.game.gameState)) {
          console.log(`Liberando al jugador ${clientEntry.playerName} por desconexión en estado ${gameEntry.game.gameState}`);
          this.players.delete(clientEntry.playerName);
        } else {
          console.log(`Marcando jugador ${clientEntry.playerName} como desconectado temporalmente`);
        }
        
        // Pause the game if it was playing
        if (gameEntry.game.gameState === 'playing') {
          gameEntry.game.pause();
          this.broadcastGameState(clientEntry.gameId);
        }
      }
      
      // Si no quedan clientes conectados, liberar todos los jugadores y cancelar el juego
      if (gameEntry.clients.size === 0) {
        console.log(`No quedan clientes conectados para el juego ${clientEntry.gameId}, liberando jugadores`);
        
        // Liberar jugadores explícitamente del mapa de jugadores
        if (gameEntry.game.player1) {
          console.log(`Liberando jugador 1: ${gameEntry.game.player1}`);
          this.players.delete(gameEntry.game.player1);
        }
        
        if (gameEntry.game.player2) {
          console.log(`Liberando jugador 2: ${gameEntry.game.player2}`);
          this.players.delete(gameEntry.game.player2);
        }
        
        // Si el juego estaba en progreso (o esperando), cancelarlo
        if (['playing', 'paused', 'waiting'].includes(gameEntry.game.gameState)) {
          console.log(`Cancelando juego ${clientEntry.gameId} por desconexión de todos los clientes`);
          gameEntry.game.cancel();
        }
      } else {
        // Todavía hay clientes conectados, verificar si todos los jugadores están desconectados
        console.log(`Quedan ${gameEntry.clients.size} clientes conectados para el juego ${clientEntry.gameId}`);
        
        // Si todos los jugadores están desconectados por más de 30 segundos, liberar y cancelar
        const now = Date.now();
        const allPlayersDisconnected = (gameEntry.game.player1 && gameEntry.disconnectedPlayers.has(gameEntry.game.player1)) &&
                                      (gameEntry.game.player2 && gameEntry.disconnectedPlayers.has(gameEntry.game.player2));
        
        const oldestDisconnection = Math.min(
          ...[...gameEntry.disconnectedPlayers.values()]
        );
        
        // Si todos los jugadores están desconectados por más de 30 segundos, liberar y cancelar
        if (allPlayersDisconnected && now - oldestDisconnection > 30000) {
          console.log(`Todos los jugadores desconectados por más de 30 segundos, liberando y cancelando juego ${clientEntry.gameId}`);
          
          if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
          if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
          
          gameEntry.game.cancel();
          this.broadcastGameState(clientEntry.gameId);
        }
      }
    }
    
    this.clients.delete(clientId);
    console.log(`Cliente ${clientId} desregistrado`);
  }
  
  // Broadcast game state to all connected clients
  broadcastGameState(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry || gameEntry.clients.size === 0) return;
    
    const gameState = gameEntry.game.getState();

    // Broadcast to all clients
    for (const clientId of gameEntry.clients) {
      const clientEntry = this.clients.get(clientId);
      if (clientEntry && clientEntry.ws.readyState === 1) {
        clientEntry.ws.send(JSON.stringify({
          type: 'state',
          data: gameState
        }));
      }
    }
  }

  // START
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    const gameEntry = this.games.get(gameId);
    // CRÍTICO: Actualizar el tiempo de inicio al momento exacto en que comienza la partida
    const exactStartTime = Date.now();
    
    // Actualizar todos los tiempos de referencia para esta partida
    gameEntry.startTime = exactStartTime;
    gameEntry.lastActivity = exactStartTime;
    game.gameStartedAt = exactStartTime;
    game.lastUpdate = exactStartTime;
    game.totalPausedTime = 0; // Reiniciar tiempo en pausa
    game.pauseIntervals = []; // Reiniciar intervalos de pausa
    
    console.log(`Game ${gameId} starting at ${new Date(exactStartTime).toISOString()}`);
    if (game.tournamentMode) {
      console.log(`Tournament game, round ${game.tournamentRound}, ${game.isSecondSemifinal ? 'Second semifinal' : (game.tournamentRound === 2 ? 'Final' : 'First semifinal')}`);
    }
    
    const success = game.start();
    game.gameStateChangeTime = exactStartTime; // Registrar cambio de estado
    
    if (success) this.broadcastGameState(gameId);
    return success;
  }
  
  // PAUSE
  pauseGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.pause();    
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    if (success) this.broadcastGameState(gameId);  
    return success;
  }
  
  // RESUME
  resumeGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    const success = game.resume();
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();

    if (success) this.broadcastGameState(gameId); 
    return success;
  }
  
  // CANCEL - Sin necesidad de liberar IAs
  cancelGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.cancel();
    
    // Remove players
    if (game.player1) this.players.delete(game.player1);
    if (game.player2) this.players.delete(game.player2);
    
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();

    // Notificar que el juego ha terminado
    if (game.player1IsAI || game.player2IsAI) {
      console.log(`Juego ${gameId} cancelado - Notificando a las IAs`);
      aiNotifier.clearNotificationsForGame(gameId);
    }
    
    if (success) this.broadcastGameState(gameId);     
    return success;
  }
  
  // PADDLE MOVE - Modificado para ignorar movimientos de jugadores IA desde el cliente
  handlePaddleMove(gameId, player, direction) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    // Verificar si el jugador es una IA - si es así, ignorar el comando de movimiento
    if ((player === 1 && game.player1IsAI) || (player === 2 && game.player2IsAI)) {
      console.log(`Ignorando comando de movimiento manual para jugador ${player} (IA)`);
      return false;
    }
    
    game.setPaddleMove(player, direction);
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // PADDLE POSITION - Modificado para ignorar cambios de posición de jugadores IA desde el cliente
  setPaddlePosition(gameId, player, y) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    // Verificar si el jugador es una IA - si es así, ignorar el cambio de posición
    if ((player === 1 && game.player1IsAI) || (player === 2 && game.player2IsAI)) {
      console.log(`Ignorando cambio de posición manual para jugador ${player} (IA)`);
      return false;
    }
    
    game.setPaddlePosition(player, y);    
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // UPDATE GAMES - GAME LOOP
  updateGames() {
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Only update playing games
      if (gameEntry.game.gameState !== 'playing') continue;
      
      // Update game
      gameEntry.game.update();
      
      // If game just finished, send results to stats service
      if (gameEntry.game.gameState === 'finished') {
        this.sendGameResultsToStats(gameId);
      }
     
      // Broadcast updated state to clients
      this.broadcastGameState(gameId);
    }
  }
  
  // CLEAN UP INACTIVE GAMES - Sin necesidad de liberar IAs
  cleanupInactiveGames() {
    const now = Date.now();
    
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Remove games that have been inactive for over an hour
      if (now - gameEntry.lastActivity > 1000 * 60 * 60) {
        // Check if it's a tournament game
        const matchInfo = this.findMatchInfoForGame(gameId);
        
        // Remove all clients from this game
        for (const clientId of gameEntry.clients) {
          this.clients.delete(clientId);
        }
        
        // Remove players
        if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
        if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
        
        // Notificar que el juego ha terminado
        if (gameEntry.game.player1IsAI || gameEntry.game.player2IsAI) {
          console.log(`Juego ${gameId} eliminado por inactividad - Notificando a las IAs`);
          aiNotifier.clearNotificationsForGame(gameId);
        }
        
        // Remove game
        this.games.delete(gameId);
        
        // Handle tournament game cleanup if applicable
        if (matchInfo) {
          this.handleTournamentGameCleanup(matchInfo.tournamentId, gameId);
        }
        
        console.log(`Game ${gameId} removed due to inactivity`);
      }
    }
  }
  
  // RESULTS
  async sendGameResultsToStats(gameId) {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;
    
    // Verificar si esta partida ya se envió a stats
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return;
    
    // Si ya se envió a stats, no enviar de nuevo
    if (gameEntry.sentToStats) {
      console.log(`Game ${gameId} already sent to stats, skipping duplicate send`);
      return;
    }
    
    console.log(`Sending game results for ${gameId} to stats service`);

    const statsService = config.services.stats;
    
    // Usar el tiempo de finalización registrado, o el tiempo actual si no existe
    const now = Date.now();
    const startTime = gameEntry.startTime || (now - 10000); // Usar 10 segundos por defecto si no hay startTime
    const finishTime = gameEntry.finishTime || now;
    
    try {
      // Verificar si es un juego de torneo
      const isTournamentGame = gameState.settings?.tournamentMode === true;
      let matchInfo = null;
      let tournamentDbId = null;
      
      if (isTournamentGame) {
        console.log(`Game ${gameId} is a tournament game according to settings`);
        
        // Buscar información del torneo
        for (const [tournamentId, tournament] of this.tournaments.entries()) {
          // Buscar en todos los matches
          for (const matchId of tournament.matches) {
            const match = tournamentManager.matches.get(matchId);
            if (match && match.gameId === gameId) {
              matchInfo = {
                tournamentId: tournamentId,
                matchId: matchId,
                round: match.round || (gameState.settings.tournamentRound || 1)
              };
              
              // Usar el ID de la base de datos del torneo si está disponible
              if (tournament.dbId) {
                tournamentDbId = tournament.dbId;
              }
              
              console.log(`Found match ${matchId} in tournament ${tournamentId}, database ID: ${tournamentDbId || 'unknown'}`);
              break;
            }
          }
          if (matchInfo) break;
        }
      }
      
      // Calcular el tiempo de juego efectivo (sin pausas)
      let effectiveStartTime = new Date(startTime);
      let effectiveEndTime = new Date(finishTime);
      
      // Si hay información de tiempo en pausas, ajustar el end_time
      if (gameState.timing && gameState.timing.totalPausedTime) {
        const totalPausedMs = gameState.timing.totalPausedTime;
        console.log(`Game ${gameId} had ${totalPausedMs}ms of paused time`);
        
        // Ajustar el end_time para reflejar solo el tiempo jugado
        effectiveEndTime = new Date(finishTime - totalPausedMs);
      }
      
      // Calcular la duración efectiva en milisegundos
      const effectiveDurationMs = effectiveEndTime.getTime() - effectiveStartTime.getTime();
      console.log(`Game ${gameId} effective time: ${effectiveStartTime.toISOString()} to ${effectiveEndTime.toISOString()}`);
      console.log(`Game ${gameId} duration: ${effectiveDurationMs / 1000} seconds`);
      
      const gamePayload = {
        start_time: effectiveStartTime.toISOString(),
        end_time: effectiveEndTime.toISOString(),
        settings: {
          ballSpeed: gameState.settings?.ballSpeed || 'medium',
          paddleSize: gameState.settings?.paddleSize || 'medium',
          speedIncrement: gameState.settings?.accelerationEnabled || false,
          pointsToWin: gameState.config?.winningScore || 5
        },
        players: [
          {
            user_id: gameState.player1.name,
            score: gameState.player1.score
          },
          {
            user_id: gameState.player2.name,
            score: gameState.player2.score
          }
        ]
      };

      // Si es un juego de torneo y tenemos el ID de la base de datos, incluirlo
      if (matchInfo && tournamentDbId) {
        console.log(`Adding tournament database ID ${tournamentDbId} to game payload`);
        gamePayload.tournament_id = tournamentDbId;
        
        if (matchInfo.round === 2) {
          gamePayload.match_type = "Final";
        } else if (gameState.settings && gameState.settings.isSecondSemifinal) {
          gamePayload.match_type = "Semifinal 2";
        } else {
          gamePayload.match_type = "Semifinal 1";
        }
      } else if (isTournamentGame) {
        console.log(`Tournament game detected but no database ID found. Game will be saved without tournament link.`);
      }
      
      console.log(`Sending game payload to stats: ${JSON.stringify(gamePayload)}`);
      
      const response = await axios.post(`${statsService.url}/games`, gamePayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: statsService.timeout
      });
      
      // Marcar que este juego ya se envió a stats para evitar duplicados
      gameEntry.sentToStats = true;
      
      console.log(`Game results sent to stats service: ${gameId}`);
      
      // Si es un partido de torneo, guardar el ID de la base de datos para referencia futura
      if (matchInfo) {
        const match = tournamentManager.matches.get(matchInfo.matchId);
        if (match) {
          match.statsGameId = response.data.id;
          console.log(`Saved stats game ID ${response.data.id} for match ${matchInfo.matchId}`);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error(`Failed to send game results to stats service: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }

  // Helper method to find tournament match information
  findMatchInfoForGame(gameId) {
    for (const [tournamentId, tournament] of this.tournaments.entries()) {
      const matchInfo = tournament.matches.find(match => match.gameId === gameId);

      if (matchInfo) {
        return { 
          tournamentId, 
          round: matchInfo.round 
        };
      }
    }
    
    return null;
  }

  // Add method to register tournament
  registerTournament(tournamentId, tournamentData) {
    console.log(`Registering tournament ${tournamentId} in gameManager`);
    this.tournaments.set(tournamentId, tournamentData);
  }

  // Tournament game cleanup
  handleTournamentGameCleanup(tournamentId, gameId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;
    
    // Remove the game from tournament matches
    tournament.matches = tournament.matches.filter(match => match.gameId !== gameId);
    
    // If no matches left, remove tournament
    if (tournament.matches.length === 0) {
      this.tournaments.delete(tournamentId);
    }
  }

  // Cleanup method to stop intervals when needed
  cleanup() {
    clearInterval(this.updateGamesInterval);
    clearInterval(this.cleanupGamesInterval);
  }
}

// Export a singleton instance
const gameManagerInstance = new GameManager();
module.exports = gameManagerInstance;

// Importamos tournamentManager después de exportar la instancia
tournamentManager = require('./tournament-manager');