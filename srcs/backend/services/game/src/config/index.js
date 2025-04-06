"use strict";

require("dotenv").config();

// AI
const AI = {
  AI_deeppong: {
    name: 'DeepPong',
    url: process.env.AI_DEEPPONG_URL || "http://ai_deeppong:3000",
    timeout: 5000,
  }
};

const config = {
  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) || "game",
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[1]) || 3000,
  host: "0.0.0.0", 
  version: "1.0",

  // Services
  services: {
    stats: {
      url: process.env.STATS_URL || "http://stats:3000",
      timeout: 5000,
    }
  },

  // Game options
  AI: AI,
  game: {
    defaults: {
      ballSpeed: 'medium',        // slow, medium, fast
      winningScore: 5,            // 1 - 20
      accelerationEnabled: false, // true, false
      paddleSize: 'medium',       // short, medium, long
      ai_opponents: Object.values(AI).map(ai => ai.name),
    },
    disconnectionTimeout: 30000,  // 30 seconds
    inactivityTimeout: 3600000    // 1 hour
  },
  
};

module.exports = config;