"use strict";

require("dotenv").config();

const services = require("./services");

// Get the current mode (development or production)
const env = process.env.NODE_ENV || "development";
const isDev = env === "development";

const config = {
  // Server
  serviceName:
    (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) ||
    "template",
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

  // Redis
  redis: {
    connectionName:
      (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) ||
      "auth",
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

  // SQLite
  database: {
    path: "./data/auth.sqlite",
    operationTimeout: 5000,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || JWTSecret,
    algorithm: "aes-256-cbc",
  },

  // Swagger
  swagger: {
    info: {
      title: "Authentication API",
      description:
        "API for user authentication, including login, registration, token management, and two-factor authentication (2FA)",
      version: "1.0.0",
    },
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
  },
};

module.exports = config;
