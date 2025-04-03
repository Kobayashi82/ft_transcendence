"use strict";

module.exports = {
  name: "game",
  url: process.env.GAME_SERVICE_URL || "http://game:3000",
  prefix: "/game",
  routes: {
    
    // Health check
    "/health": {
      method: ["GET"],
      path: "/health",
      rateLimit: { max: 20, timeWindow: 10 }
    },
  },
  timeout: 5000,
};