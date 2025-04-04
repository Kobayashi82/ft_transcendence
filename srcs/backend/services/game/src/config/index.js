"use strict";

require("dotenv").config();

const config = {
  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) || "game",
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[1]) || 3000,
  host: "0.0.0.0", version: "1.0",

  // Services
  services: {
    stats: {
      url: process.env.STATS_URL || "http://stats:3000",
      timeout: 5000,
    },
    AI_deeppong: {
      url: process.env.AI_DEEPPONG_URL || "http://ai_deeppong:3000",
      timeout: 5000,
    },
  },

  // Websocket configuration
  websocket: {
    reconnectTimeout: 5000,
    options: {
      maxPayload: 1024 * 1024, // 1MB
      pingTimeout: 30000,
      pingInterval: 15000
    }
  }
};

module.exports = config;
