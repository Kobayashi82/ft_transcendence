"use strict";

const config = require('../config');
const PongGame = require('./game-logic');
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

class GameManager {
  constructor() {
    this.games = new Map();
    this.clients = new Map();
    this.players = new Map(); // Maps player names to gameIds
    
    setInterval(() => this.updateGames(), 16); // 60 fps
    setInterval(() => this.cleanupInactiveGames(), 60000);
  }

  // CREATE
  createGame(options = {}) {
    const gameId = uuidv4();
    const game = new PongGame(options);
    
    this.games.set(gameId, {
      game,
      clients: new Set(),
      lastActivity: Date.now(),
      disconnectedPlayers: new Map() // Initialize this Map
    });
    
    console.log(`Game created: ${gameId}`);
    return gameId;
  }
  
  // GET GAME
  getGame(gameId) {
    const gameEntry = this.games.get(gameId);
    return gameEntry ? gameEntry.game : null;
  }
  
  // STATUS
  getGameState(gameId) {
    const game = this.getGame(gameId);   
    return game ? game.getState() : null;
  }

  // ADD PLAYER
  addPlayer(gameId, playerName, playerNumber) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    gameEntry.game.setPlayer(playerNumber, playerName);
    this.players.set(playerName, { gameId, playerNumber }); // Add to player-gameId mapping
    gameEntry.lastActivity = Date.now();
    
    return true;
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
  
  // ------------------ WEBSOCKETS ------------------

  // Register a WebSocket client
  registerClient(gameId, clientId, ws, playerName = null, isSpectator = false) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    gameEntry.clients.add(clientId);  // Add client to game's client list
    
    this.clients.set(clientId, {      // Store client info
      ws,
      gameId,
      playerName,
      isSpectator
    });
    
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
      
      // If this was a player (not spectator), mark them as disconnected
      if (clientEntry.playerName && !clientEntry.isSpectator) {
        gameEntry.disconnectedPlayers.set(clientEntry.playerName, Date.now());
        
        // Pause the game if it was playing
        if (gameEntry.game.gameState === 'playing') {
          gameEntry.game.pause();
          this.broadcastGameState(clientEntry.gameId);
        }
      }
      
      // If no clients are connected, clean up player data
      if (gameEntry.clients.size === 0 && 
         ['playing', 'paused', 'waiting'].includes(gameEntry.game.gameState)) {
        // Remove players from the game
        if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
        if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
        
        // Mark game as cancelled
        gameEntry.game.cancel();
      }
    }
    
    this.clients.delete(clientId);
    console.log(`Client ${clientId} unregistered`);
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
  
  // ------------------ WEBSOCKETS ------------------

  // START
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;

    const success = game.start();
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();

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
    
    // Remove players
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
  
  // UPDATE
  updateGames() {
    for (const [gameId, gameEntry] of this.games.entries()) {
      if (gameEntry.game.gameState !== 'playing') continue;
      
      // Update game
      gameEntry.game.update();
      
      // If game just finished, send results to stats service
      if (gameEntry.game.gameState === 'finished') this.sendGameResultsToStats(gameId);
     
      // Broadcast updated state to clients
      this.broadcastGameState(gameId);
    }
  }
  
  // CLEAN UP
  cleanupInactiveGames() {
    const now = Date.now();
    
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Remove games that have been inactive for over an hour
      if (now - gameEntry.lastActivity > 1000 * 60 * 60) {
        // Remove all clients from this game
        for (const clientId of gameEntry.clients) {
          this.clients.delete(clientId);
        }
        
        // Remove players
        if (gameEntry.game.player1) this.players.delete(gameEntry.game.player1);
        if (gameEntry.game.player2) this.players.delete(gameEntry.game.player2);
        
        // Remove game
        this.games.delete(gameId);
        console.log(`Game ${gameId} removed due to inactivity`);
      }
    }
  }
  
  // RESULTS
  async sendGameResultsToStats(gameId) {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;
    
    console.log(`Sending game results for ${gameId} to stats service`);

    const statsService = config.services.stats;
    const now = Date.now();
    const startTime = this.games.get(gameId).startTime || (now - 60000); // Default to 1 minute ago if startTime not set
    
    try {
      // Format data according to what the /games endpoint expects
      const response = await axios.post(`${statsService.url}/games`, {
        // Required fields according to the POST /games schema
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(now).toISOString(),
        settings: gameState.settings || {},
        players: [
          // Convert player1 and player2 into the expected players array format
          {
            user_id: gameState.player1.name,
            score: gameState.player1.score
          },
          {
            user_id: gameState.player2.name,
            score: gameState.player2.score
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: statsService.timeout
      });
      
      console.log(`Game results sent to stats service: ${gameId}`);
    } catch (error) {
      console.error(`Failed to send game results to stats service: ${error.message}`);
      // Log more detailed error information if available
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }
}

module.exports = new GameManager();