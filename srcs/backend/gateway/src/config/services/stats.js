"use strict";

module.exports = {
  name: "stats",
  url: process.env.STATS_SERVICE_URL || "http://stats:3000",
  prefix: "/stats",
  routes: {
    // Rutas de jugadores
    "/players": {
      method: ["GET"],
      path: "/players",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/players/:id": {
      method: ["GET"],
      path: "/players/:id",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/players/:id/games": {
      method: ["GET"],
      path: "/players/:id/games",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/players/:id/tournaments": {
      method: ["GET"],
      path: "/players/:id/tournaments",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/players/:id/stats": {
      method: ["GET"],
      path: "/players/:id/stats",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/players/user/:userId": {
      method: ["GET"],
      path: "/players/user/:userId",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    
    // Rutas de juegos
    "/games": {
      method: ["GET", "POST"],
      path: "/games",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/games/:id": {
      method: ["GET", "PATCH", "DELETE"],
      path: "/games/:id",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/games/user/:userId": {
      method: ["GET"],
      path: "/games/user/:userId",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    
    // Rutas de torneos
    "/tournaments": {
      method: ["GET", "POST"],
      path: "/tournaments",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/tournaments/:id": {
      method: ["GET", "PATCH", "DELETE"],
      path: "/tournaments/:id",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/tournaments/user/:userId": {
      method: ["GET"],
      path: "/tournaments/user/:userId",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/tournaments/:id/players": {
      method: ["POST"],
      path: "/tournaments/:id/players",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/tournaments/:id/results": {
      method: ["POST"],
      path: "/tournaments/:id/results",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    
    // Rutas de estadísticas
    "/stats": {
      method: ["GET"],
      path: "/stats",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/stats/leaderboard/wins": {
      method: ["GET"],
      path: "/stats/leaderboard/wins",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/stats/leaderboard/winrate": {
      method: ["GET"],
      path: "/stats/leaderboard/winrate",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/stats/leaderboard/tournaments": {
      method: ["GET"],
      path: "/stats/leaderboard/tournaments",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/stats/user/:userId": {
      method: ["GET"],
      path: "/stats/user/:userId",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    
    // Health check endpoint for the service
    "/health": {
      method: ["GET"],
      path: "/health",
      rateLimit: { max: 20, timeWindow: 10 }
    },
  },
  timeout: 5000,
};