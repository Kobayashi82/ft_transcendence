"use strict";

require("dotenv").config();

const config = {
  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) || "ai_deeppong",
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[1]) || 3000,
  host: "0.0.0.0", version: "1.0",

  // Services
  services: {
    game: {
      url: process.env.GAME_SERVICE_URL || 'http://game:3000',
    }
  },
  
  // AI
  ai: {
    updateInterval: 100,
    defaultDifficulty: 'hard',
  }
};

module.exports = config;
