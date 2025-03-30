"use strict";

require("dotenv").config();

const services = require("./services");

// Get the current mode (development or production)
const env = process.env.NODE_ENV || "development";
const isDev = env === "development";

// JWT secret mandatory
let JWTSecret = process.env.JWT_SECRET;
if (!JWTSecret) {
  console.error(
    new Date().toISOString(),
    "\x1b[31merror\x1b[0m JWT_SECRET is required in production"
  );
  process.exit(1);
}

const config = {
  // Server
  serviceName:
    (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) ||
    "gateway",
  port:
    (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[1]) || 3000,
  host: "0.0.0.0",
  isDev,
  env,
  version: "1.0",

  // Log level
  logLevel: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  // Services
  services: services.services,
  routeMap: services.routeMap,

  // Redis
  redis: {
    connectionName:
      (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) ||
      "gateway",
    host:
      (process.env.REDIS_URL && process.env.REDIS_URL.split(":")[0]) || "redis",
    port:
      (process.env.REDIS_URL && process.env.REDIS_URL.split(":")[1]) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },

  helmet: {
    // Disable CSP since we are not serving HTML/CSS/JS content directly
    contentSecurityPolicy: false,

    // Disable Frameguard since we are not serving content that can be embedded in iframes
    frameguard: false,

    // Protection against XSS
    xssFilter: true,

    // Prevent MIME sniffing
    noSniff: true,

    // Hide server information
    hidePoweredBy: true,

    // Control referrer policy
    referrerPolicy: {
      policy: "no-referrer",
    },

    // Cross-origin resource policies
    crossOriginResourcePolicy: {
      policy: "same-site",
    },

    // Disable unnecessary policies for API
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,

    // Add HSTS (even though behind nginx)
    strictTransportSecurity: {
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true,
    },

    // Prevent DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
  },

  // Rate limiting
  rateLimit: {
    max: process.env.RATE_LIMIT_MAX || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  },

  // JWT
  jwt: {
    secret: JWTSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};

module.exports = config;
