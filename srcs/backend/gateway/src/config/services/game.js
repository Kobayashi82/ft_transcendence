"use strict";

module.exports = {
  name: "game",
  url: process.env.GAME_SERVICE_URL || "http://game:3000",
  prefix: "/game",
  routes: {    
    // Get game options
    "/options": {
      method: ["GET"],
      path: "/options",
      rateLimit: { max: 10, timeWindow: 5 }
    },
    
    // Create a new game
    "": {
      method: ["POST"],
      path: "/",
      rateLimit: { max: 5, timeWindow: 10 }
    },
    
    // List all active games
    "s": {
      method: ["GET"],
      path: "/games",
      rateLimit: { max: 10, timeWindow: 5 }
    },
    
    // Get a specific game state
    "/:gameId": {
      method: ["GET"],
      path: "/:gameId",
      rateLimit: { max: 20, timeWindow: 5 }
    },
    
    // Join a game as player 2
    "/:gameId/join": {
      method: ["POST"],
      path: "/:gameId/join",
      rateLimit: { max: 5, timeWindow: 10 }
    },
    
    // Join a game as spectator
    "/:gameId/spectate": {
      method: ["POST"],
      path: "/:gameId/spectate",
      rateLimit: { max: 10, timeWindow: 5 }
    },
    
    // Start a game
    "/:gameId/start": {
      method: ["POST"],
      path: "/:gameId/start",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    
    // Pause a game
    "/:gameId/pause": {
      method: ["POST"],
      path: "/:gameId/pause",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    
    // Resume a paused game
    "/:gameId/resume": {
      method: ["POST"],
      path: "/:gameId/resume",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    
    // Cancel a game
    "/:gameId/cancel": {
      method: ["POST"],
      path: "/:gameId/cancel",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    
    // Reset a game
    "/:gameId/reset": {
      method: ["POST"],
      path: "/:gameId/reset",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    
    // Send player movement
    "/:gameId/move": {
      method: ["POST"],
      path: "/:gameId/move",
      rateLimit: { max: 60, timeWindow: 5 }  // Permitir movimientos frecuentes
    },
    
    // Set paddle position directly
    "/:gameId/position": {
      method: ["POST"],
      path: "/:gameId/position",
      rateLimit: { max: 60, timeWindow: 5 }  // Permitir actualizaciones frecuentes de posición
    }
  },
  // Health check
  "/health": {
    method: ["GET"],
    path: "/health",
    rateLimit: { max: 20, timeWindow: 10 }
  },
  wsEnabled: true,
  wsPath: "/ws/pong",
  timeout: 5000,
};