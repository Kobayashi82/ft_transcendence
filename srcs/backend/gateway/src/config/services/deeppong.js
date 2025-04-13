"use strict";

module.exports = {
  name: "deeppong",
  url: process.env.DEEPPONG_SERVICE_URL || "http://deeppong:3000",
  prefix: "/deeppong",
  routes: {
    "/join": {
      method: ["POST"],
      path: "/join",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/games": {
      method: ["GET"],
      path: "/games",
      rateLimit: { max: 20, timeWindow: 10 }
    },
    "/leave": {
      method: ["POST"],
      path: "/leave",
      rateLimit: { max: 20, timeWindow: 10 }
    },

    // Health check
    "/health": {
      method: ["GET"],
      path: "/health",
      rateLimit: { max: 20, timeWindow: 10 }
    },
  },
  timeout: 2000,
};