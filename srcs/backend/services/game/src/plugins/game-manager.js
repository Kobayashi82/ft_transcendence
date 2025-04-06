"use strict";

const PongGame = require('./game-logic');
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
  sendGameResultsToStats(gameId) {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;
    
    console.log(`Sending game results for ${gameId} to stats service`);
    
    // This would be implemented as a service call when the stats service is ready
    /*
    const statsService = config.services.stats;
    
    try {
      // You would use a HTTP client like axios or node-fetch here
      const response = await fetch(`${statsService.url}/game-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId,
          player1: {
            name: gameState.player1.name,
            score: gameState.player1.score
          },
          player2: {
            name: gameState.player2.name,
            score: gameState.player2.score
          },
          duration: Date.now() - this.games.get(gameId).startTime,
          settings: gameState.settings
        }),
        timeout: statsService.timeout
      });
      
      console.log(`Game results sent to stats service: ${gameId}`);
    } catch (error) {
      console.error(`Failed to send game results to stats service: ${error.message}`);
    }
    */
  }
}

module.exports = new GameManager();
