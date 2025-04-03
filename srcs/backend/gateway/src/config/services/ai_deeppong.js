"use strict";

module.exports = {
  name: "ai_deeppong",
  url: process.env.AI_DEEPPONG_SERVICE_URL || "http://ai_deeppong:3000",
  prefix: "/ai_deeppong",
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