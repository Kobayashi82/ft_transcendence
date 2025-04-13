"use strict";

module.exports = {
  name: "deeppong",
  url: process.env.DEEPPONG_SERVICE_URL || "http://deeppong:3000",
  prefix: "/deeppong",
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