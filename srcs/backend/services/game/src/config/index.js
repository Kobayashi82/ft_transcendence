"use strict";

require("dotenv").config();

// AI
const AI = {
  deeppong: {
    name: 'DeepPong',
    url: process.env.DEEPPONG_URL || "http://deeppong:3000",
    timeout: 2000,
  },
  AI_K_Pong: {
    name: 'K-Pong',
    url: process.env.DEEPPONG_URL || "http://deeppong:3000",
    timeout: 2000,
  },
  AI_DumbBot: {
    name: 'DumbBot',
    url: process.env.DEEPPONG_URL || "http://deeppong:3000",
    timeout: 2000,
  }
};

const paddleSizes = { short: 40, medium: 80, long: 120 };
const initialSpeeds = { slow: 4, medium: 6, fast: 8 };

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
    width: 600,
    height: 400,    
    paddleWidth: 10,
    paddleHeight: paddleSizes['medium'],
    ballSize: 10,
    initialBallVelocity: initialSpeeds['medium'],
    defaults: {
      ballSpeed: 'medium',        // slow, medium, fast
      winningScore: 5,            // 1 - 20
      accelerationEnabled: false, // true, false
      paddleSize: 'medium',       // short, medium, long
      ai_opponents: Object.values(AI).map(ai => ai.name),
    },
    disconnectionTimeout: 35 * 1000,
    inactivityTimeout: 60 * 10 * 1000
  },
  
};

module.exports = config;