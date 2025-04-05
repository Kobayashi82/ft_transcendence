"use strict";

const PongGame = require('./game-logic');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class GameManager {
  constructor() {
    this.games = new Map();
    this.clients = new Map();
    this.players = new Map(); // Maps player names to gameIds
    
    // Set up game loop
    setInterval(() => this.updateGames(), 16); // 60 FPS
    
    // Set up cleanup for inactive games
    setInterval(() => this.cleanupInactiveGames(), 60000); // Every minute
    
    // Set up handling of disconnected players
    setInterval(() => this.handleDisconnectedPlayers(), 5000); // Every 5 seconds
  }
  
  createGame(options = {}) {
    const gameId = uuidv4();
    const game = new PongGame(options);
    
    this.games.set(gameId, {
      game,
      clients: new Set(),
      spectators: new Set(),
      lastActivity: Date.now(),
      disconnectedPlayers: new Map(), // Track disconnected players and their disconnect time
      disconnectionTimeout: 30000 // 30 seconds before removing a disconnected player
    });
    
    console.log(`Game created: ${gameId}`);
    return gameId;
  }
  
  getGame(gameId) {
    const gameEntry = this.games.get(gameId);
    return gameEntry ? gameEntry.game : null;
  }
  
  getGameState(gameId) {
    const game = this.getGame(gameId);
    if (!game) return null;
    
    return game.getState();
  }
  
  listGames() {
    const gamesList = [];
    
    for (const [gameId, gameEntry] of this.games.entries()) {
      const game = gameEntry.game;
      gamesList.push({
        gameId,
        players: {
          player1: game.player1,
          player2: game.player2
        },
        spectators: gameEntry.spectators.size,
        state: game.gameState,
        score: {
          player1: game.player1Score,
          player2: game.player2Score
        },
        settings: {
          ballSpeed: game.ballSpeed,
          winningScore: game.winningScore,
          paddleSize: game.paddleSize,
          accelerationEnabled: game.accelerationEnabled
        }
      });
    }
    
    return gamesList;
  }
  
  // Add a player to a game
  addPlayer(gameId, playerName, playerNumber) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    // Set player in game
    gameEntry.game.setPlayer(playerNumber, playerName);
    
    // Add to player-gameId mapping
    this.players.set(playerName, {
      gameId,
      playerNumber
    });
    
    // Update last activity timestamp
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // Add a spectator to a game
  addSpectator(gameId, spectatorName) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    gameEntry.spectators.add(spectatorName);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // Check if player is already in a game
  isPlayerInGame(playerName) {
    return this.players.has(playerName);
  }
  
  // Check if game has both players
  isGameFull(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    return game.player1 !== null && game.player2 !== null;
  }
  
  // Check if game has enough players to start
  hasEnoughPlayers(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    return game.hasBothPlayers();
  }
  
  // Register a WebSocket client
  registerClient(gameId, clientId, ws, playerName = null, isSpectator = false) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    // Add client to game's client list
    gameEntry.clients.add(clientId);
    
    // Store client info
    this.clients.set(clientId, {
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
  
  // Check if a game has any disconnected players
  hasDisconnectedPlayers(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry) return false;
    
    return gameEntry.disconnectedPlayers.size > 0;
  }
  
  // Broadcast game state to all connected clients
  broadcastGameState(gameId) {
    const gameEntry = this.games.get(gameId);
    if (!gameEntry || gameEntry.clients.size === 0) return;
    
    const gameState = gameEntry.game.getState();
    
    // Broadcast to all clients
    for (const clientId of gameEntry.clients) {
      const clientEntry = this.clients.get(clientId);
      if (clientEntry && clientEntry.ws.readyState === 1) { // WebSocket.OPEN
        clientEntry.ws.send(JSON.stringify({
          type: 'gameState',
          data: gameState
        }));
      }
    }
  }
  
  // Handle disconnected players
  handleDisconnectedPlayers() {
    const now = Date.now();
    
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Skip games with no disconnected players
      if (gameEntry.disconnectedPlayers.size === 0) {
        continue;
      }
      
      // Check each disconnected player
      for (const [playerName, disconnectTime] of gameEntry.disconnectedPlayers.entries()) {
        // If player has been disconnected longer than the timeout, remove them
        if (now - disconnectTime > gameEntry.disconnectionTimeout) {
          console.log(`Player ${playerName} removed from game ${gameId} due to timeout`);
          
          // Remove player from game
          if (gameEntry.game.player1 === playerName) {
            gameEntry.game.player1 = null;
          } else if (gameEntry.game.player2 === playerName) {
            gameEntry.game.player2 = null;
          }
          
          // Remove from player-gameId mapping
          this.players.delete(playerName);
          
          // Remove from disconnected players
          gameEntry.disconnectedPlayers.delete(playerName);
          
          // If game was in progress, cancel it
          if (gameEntry.game.gameState === 'playing' || gameEntry.game.gameState === 'paused') {
            gameEntry.game.cancel();
            this.broadcastGameState(gameId);
          }
        }
      }
    }
  }
  
  // Start a game
  startGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    // Check if game has both players
    if (!game.hasBothPlayers()) {
      return false;
    }
    
    const success = game.start();
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    // Broadcast new state to all clients
    if (success) {
      this.broadcastGameState(gameId);
    }
    
    return success;
  }
  
  // Pause a game
  pauseGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.pause();
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    // Broadcast new state to all clients
    if (success) {
      this.broadcastGameState(gameId);
    }
    
    return success;
  }
  
  // Resume a paused game
  resumeGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.resume();
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    // Broadcast new state to all clients
    if (success) {
      this.broadcastGameState(gameId);
    }
    
    return success;
  }
  
  // Cancel a game
  cancelGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    const success = game.cancel();
    
    // Remove player references
    if (game.player1) {
      this.players.delete(game.player1);
    }
    if (game.player2) {
      this.players.delete(game.player2);
    }
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    // Broadcast new state to all clients
    if (success) {
      this.broadcastGameState(gameId);
    }
    
    return success;
  }
  
  // Reset a game
  resetGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    game.reset();
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    // Broadcast new state to all clients
    this.broadcastGameState(gameId);
    
    return true;
  }
  
  // Handle player movement
  handlePlayerMovement(gameId, player, direction) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    game.setPlayerMovement(player, direction);
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // Set paddle position directly
  setPaddlePosition(gameId, player, y) {
    const game = this.getGame(gameId);
    if (!game) return false;
    
    game.setPaddlePosition(player, y);
    
    // Update last activity timestamp
    const gameEntry = this.games.get(gameId);
    gameEntry.lastActivity = Date.now();
    
    return true;
  }
  
  // Update games state
  updateGames() {
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Skip inactive games
      if (gameEntry.game.gameState !== 'playing') {
        continue;
      }
      
      // Update game state
      gameEntry.game.update();
      
      // If game just finished, send results to stats service
      if (gameEntry.game.gameState === 'finished') {
        this.sendGameResultsToStats(gameId);
      }
      
      // Broadcast updated state to clients
      this.broadcastGameState(gameId);
    }
  }
  
  // Clean up inactive games
  cleanupInactiveGames() {
    const now = Date.now();
    
    for (const [gameId, gameEntry] of this.games.entries()) {
      // Remove games that have been inactive for over an hour
      if (now - gameEntry.lastActivity > 1000 * 60 * 60) {
        // Remove all clients from this game
        for (const clientId of gameEntry.clients) {
          this.clients.delete(clientId);
        }
        
        // Remove player references
        if (gameEntry.game.player1) {
          this.players.delete(gameEntry.game.player1);
        }
        if (gameEntry.game.player2) {
          this.players.delete(gameEntry.game.player2);
        }
        
        // Remove the game
        this.games.delete(gameId);
        console.log(`Game ${gameId} removed due to inactivity`);
      }
    }
  }
  
  // Send game results to the stats service
  sendGameResultsToStats(gameId) {
    const gameState = this.getGameState(gameId);
    if (!gameState) return;
    
    // TODO: Implement when stats service is ready
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