"use strict";

module.exports = {
  name: "game",
  url: process.env.GAME_SERVICE_URL || "http://game:3000",
  prefix: "/game",
  routes: {    
    "/options": {
      method: ["GET"],
      path: "/options",
      rateLimit: { max: 10, timeWindow: 5 }
    },
    "/create": {
      method: ["POST"],
      path: "/create",
      rateLimit: { max: 5, timeWindow: 10 }
    },
    "/:gameId/start": {
      method: ["POST"],
      path: "/:gameId/start",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    "/:gameId/pause": {
      method: ["POST"],
      path: "/:gameId/pause",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    "/:gameId/resume": {
      method: ["POST"],
      path: "/:gameId/resume",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    "/:gameId/cancel": {
      method: ["POST"],
      path: "/:gameId/cancel",
      rateLimit: { max: 5, timeWindow: 5 }
    },
    "/:gameId/move": {
      method: ["POST"],
      path: "/:gameId/move",
      rateLimit: { max: 60, timeWindow: 5 }
    },
    "/:gameId/position": {
      method: ["POST"],
      path: "/:gameId/position",
      rateLimit: { max: 60, timeWindow: 5 }
    },
    "/:gameId": {
      method: ["GET"],
      path: "/:gameId",
      rateLimit: { max: 20, timeWindow: 5 }
    },
    "/tournament/create": {
      method: ["POST"],
      path: "/tournament/create",
      rateLimit: { max: 5, timeWindow: 10 }
    },
    "/tournament/:tournamentId/cancel": {
      method: ["POST"],
      path: "/tournament/:tournamentId/cancel",
      rateLimit: { max: 5, timeWindow: 10 }
    },

    "/ws/pong": {
      method: ["GET"],
      path: "/ws/pong",
      rateLimit: { max: 20, timeWindow: 5 }
    },

    "/health": {
      method: ["GET"],
      path: "/health",
      rateLimit: { max: 20, timeWindow: 10 }
    },
  },
  wsEnabled: true,
  wsPath: "/game/ws/pong",
  timeout: 5000,
};