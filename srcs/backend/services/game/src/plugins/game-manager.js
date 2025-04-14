"use strict";

const config = require('../config');
const PongGame = require('./game-logic');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

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
    
    this.updateGamesInterval = setInterval(this.updateGames, 33); // 30 fps
    this.cleanupGamesInterval = setInterval(this.cleanupInactiveGames, 60000);
  }

  // CREATE GAME
  createGame(settings) {
    const gameId = uuidv4();
    const game = new PongGame(settings);
    const exactStartTime = Date.now();

    this.games.set(gameId, {
      game: game,
      id: gameId,
      startTime: exactStartTime,
      finishTime: null,
      clients: new Set(),
      players: {},
      spectators: new Set(),
      disconnectedPlayers: new Map(),
      lastBroadcast: Date.now(),
      lastActivity: Date.now(),
      sentToStats: false
    });

    return gameId;
  }

  // FINISH GAME
  finishGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    game.finishTime = Date.now();
    if (game.gameState !== 'next') game.gameState = 'finished';

    // Send results to stats service
    setTimeout(() => { this.sendGameResultsToStats(gameId); }, 500);
    return true;
  }

  // GET GAME
  getGame(gameId) {
    const gameEntry = this.games.get(gameId);
    return gameEntry ? gameEntry.game : null;
  }

  // GET GAME STATE
  getGameState(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return null;

    const state = gameEntry.game.getState();
    if (gameEntry.game.player1IsAI) state.player1.isAI = true;    
    if (gameEntry.game.player2IsAI) state.player2.isAI = true;

    return state;
  }

  // ADD PLAYER
  async addPlayer(gameId, playerName, playerNumber) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;

    gameEntry.game.setPlayer(playerNumber, playerName);
    this.players.set(playerName, { gameId, playerNumber });
    gameEntry.lastActivity = Date.now();

    const isAI = this.isAIPlayer(playerName);
    if (isAI) {
      gameEntry.game['player' + playerNumber + 'IsAI'] = true;

      try { await axios.post(`${config.AI.deeppong.url}/join`, { game_id: gameId, ai_name: playerName, player_number: playerNumber }, { headers: { 'Content-Type': 'application/json' }, timeout: config.AI.deeppong.timeout }); }
      catch (error) {}
    }
    
    return true;
  }
  
  // IS AI PLAYER
  isAIPlayer(playerName) {
    if (!playerName) return false;

    const aiOpponents = config.game?.defaults?.ai_opponents || [];
    return aiOpponents.some(aiName => aiName.toLowerCase() === playerName.toLowerCase());
  }

  // IS PLAYER PLAYING
  isPlayerInGame(playerName) {
    return this.players.has(playerName);
  }
  
  // GET CLIENT INFO
  getClientInfo(clientId) {
    return this.clients.get(clientId);
  }
  
  // HAS DISCONNECTED PLAYERS
  hasDisconnectedPlayers(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;

    return gameEntry.disconnectedPlayers.size > 0;
  }
  
  // REGISTER CLIENT
  registerClient(gameId, clientId, ws, playerName = null) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;

    gameEntry.clients.add(clientId);
    this.clients.set(clientId, { ws, gameId, playerName});

    if (playerName && gameEntry.disconnectedPlayers.has(playerName)) {
      gameEntry.disconnectedPlayers.delete(playerName);
      if (gameEntry.game.gameState === 'paused' && !this.hasDisconnectedPlayers(gameId)) {
        gameEntry.game.resume();
        this.broadcastGameState(gameId);
      }
    }

    return true;
  }
  
  // UNREGISTER CLIENT
  unregisterClient(clientId) {
    const clientEntry = this.clients.get(clientId);
    if (!clientEntry) return;

    const gameEntry = this.games.get(clientEntry.gameId);
    if (gameEntry) {
      gameEntry.clients.delete(clientId);

      if (clientEntry.playerName) {
        gameEntry.disconnectedPlayers.set(clientEntry.playerName, Date.now());
        if (!['playing', 'paused', 'waiting'].includes(gameEntry.game.gameState)) this.players.delete(clientEntry.playerName);
        if (gameEntry.game.gameState === 'playing') {
          gameEntry.game.pause();
          this.broadcastGameState(clientEntry.gameId);
        }
      }

      if (gameEntry.clients.size === 0) {
        if (gameEntry.game.player1IsAI && gameEntry.game.player2IsAI) {
          if (gameEntry.game.gameState === 'paused') gameEntry.game.resume();
          gameEntry.lastActivity = Date.now();
        } else {
          if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
          if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
          if (['playing', 'paused', 'waiting'].includes(gameEntry.game.gameState)) gameEntry.game.cancel();
        }
      } else {      
        const now = Date.now();
        const allPlayersDisconnected = (gameEntry.game.player1 && gameEntry.disconnectedPlayers.has(gameEntry.game.player1)) && (gameEntry.game.player2 && gameEntry.disconnectedPlayers.has(gameEntry.game.player2));
        const oldestDisconnection = Math.min(...[...gameEntry.disconnectedPlayers.values()]);
        if (allPlayersDisconnected && now - oldestDisconnection > 30000) {
          if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
          if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
          gameEntry.game.cancel();
          this.broadcastGameState(clientEntry.gameId);
        }
      }
    }

    this.clients.delete(clientId);
  }
  
  // BROADCAST GAME STATE
  broadcastGameState(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry || gameEntry.clients.size === 0) return;

    const gameState = gameEntry.game.getState();

    for (const clientId of gameEntry.clients) {
      const clientEntry = this.clients.get(clientId);
      if (clientEntry && clientEntry.ws.readyState === 1) clientEntry.ws.send(JSON.stringify({ type: 'state', data: gameState }));
    }
  }

  // START
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    const gameEntry = this.games.get(gameId);
    const exactStartTime = Date.now();
    gameEntry.startTime = exactStartTime;
    gameEntry.lastActivity = exactStartTime;
    game.gameStartedAt = exactStartTime;
    game.lastUpdate = exactStartTime;
    game.totalPausedTime = 0;
    game.pauseIntervals = [];
    
    const success = game.start();
    game.gameStateChangeTime = exactStartTime;
    
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
  
  // CANCEL
  cancelGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.cancel();
    
    if (game.player1) this.players.delete(game.player1);
    if (game.player2) this.players.delete(game.player2);
    
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    if (success) this.broadcastGameState(gameId);     
    return success;
  }
  
  // PADDLE MOVE
  handlePaddleMove(gameId, player, direction) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    game.setPaddleMove(player, direction);
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // PADDLE POSITION
  setPaddlePosition(gameId, player, y) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    game.setPaddlePosition(player, y);    
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // UPDATE GAMES
  updateGames() {
    for (const [gameId, gameEntry] of this.games.entries()) {
      if (gameEntry.game.gameState !== 'playing') continue;
      gameEntry.game.update();
      
      if (gameEntry.game.gameState === 'finished') {
        this.sendGameResultsToStats(gameId);
        if (gameEntry.game.player1IsAI && gameEntry.game.player2IsAI && gameEntry.clients.size === 0) gameEntry.sentToStats = true;
      }
     
      this.broadcastGameState(gameId);
    }
  }
  
  // CLEAN UP INACTIVE GAMES
  cleanupInactiveGames() {
    const now = Date.now();

    for (const [gameId, gameEntry] of this.games.entries()) {
      // Remove games that have been inactive
      if (now - gameEntry.lastActivity > config.game.inactivityTimeout) {
        // Check if this is a tournament match
        const matchInfo = this.findMatchInfoForGame(gameId);

        if (gameEntry.game.gameState === 'finished' && gameEntry.game.player1IsAI && gameEntry.game.player2IsAI && !gameEntry.sentToStats) this.sendGameResultsToStats(gameId);

        // Remove all clients from this game
        for (const clientId of gameEntry.clients) this.clients.delete(clientId);

        // Remove players
        if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
        if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);

        // Remove game
        this.games.delete(gameId);

        if (matchInfo) this.handleTournamentGameCleanup(matchInfo.tournamentId, gameId);
      }
    }
  }
  
  // RESULTS
  async sendGameResultsToStats(gameId) {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;

    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return;
    if (gameEntry.sentToStats) return;

    const statsService = config.services.stats;

    let player1Name = gameState.player1.name;
    let player2Name = gameState.player2.name;
    const player1IsAI = gameState.player1.isAI || gameEntry.game.player1IsAI;
    const player2IsAI = gameState.player2.isAI || gameEntry.game.player2IsAI;
    if (player1IsAI && player2IsAI) { gameEntry.sentToStats = true; return; }

    const now = Date.now();
    const startTime = gameEntry.startTime || now;
    const finishTime = gameEntry.finishTime || now;

    try {
      const isTournamentGame = gameState.settings?.tournamentMode === true;
      let matchInfo = null;
      let tournamentDbId = null;

      if (isTournamentGame) {
        for (const [tournamentId, tournament] of this.tournaments.entries()) {
          for (const matchId of tournament.matches) {
            const match = tournamentManager.matches.get(matchId);
            if (match && match.gameId === gameId) {
              matchInfo = { tournamentId: tournamentId, matchId: matchId, round: match.round || (gameState.settings.tournamentRound || 1) };
              if (tournament.dbId) tournamentDbId = tournament.dbId;
              break;
            }
          }
          if (matchInfo) break;
        }
      }

      let effectiveStartTime = new Date(startTime);
      let effectiveEndTime = new Date(finishTime);

      if (gameState.timing && gameState.timing.totalPausedTime) {
        const totalPausedMs = gameState.timing.totalPausedTime;
        effectiveEndTime = new Date(finishTime - totalPausedMs);
      }

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
            user_id: player1Name,
            score: gameState.player1.score
          },
          {
            user_id: player2Name,
            score: gameState.player2.score
          }
        ]
      };

      if (matchInfo && tournamentDbId) {
        gamePayload.tournament_id = tournamentDbId;

        if (matchInfo.round === 2) {
          gamePayload.match_type = "Final";
        } else if (gameState.settings && gameState.settings.isSecondSemifinal) {
          gamePayload.match_type = "Semifinal 2";
        } else {
          gamePayload.match_type = "Semifinal 1";
        }
      }

      const response = await axios.post(`${statsService.url}/games`, gamePayload, { headers: { 'Content-Type': 'application/json' }, timeout: statsService.timeout });
      gameEntry.sentToStats = true;

      if (matchInfo) {
        const match = tournamentManager.matches.get(matchInfo.matchId);
        if (match) match.statsGameId = response.data.id;
      }

      return response.data;
    } catch (error) {}
  }

  // FIND MATCH INFO
  findMatchInfoForGame(gameId) {
    for (const [tournamentId, tournament] of this.tournaments.entries()) {
      const matchInfo = tournament.matches.find(match => match.gameId === gameId);
      if (matchInfo) return { tournamentId, round: matchInfo.round };
    }

    return null;
  }

  // REGISTER TOURNAMENT
  registerTournament(tournamentId, tournamentData) {
    this.tournaments.set(tournamentId, tournamentData);
  }

  // TOURNAMENT GAME CLEANUP
  handleTournamentGameCleanup(tournamentId, gameId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.matches = tournament.matches.filter(match => match.gameId !== gameId);
    if (tournament.matches.length === 0) this.tournaments.delete(tournamentId);
  }

  // CLEANUP
  cleanup() {
    clearInterval(this.updateGamesInterval);
    clearInterval(this.cleanupGamesInterval);
  }

}

const gameManagerInstance = new GameManager();
module.exports = gameManagerInstance;
tournamentManager = require('./tournament-manager');
