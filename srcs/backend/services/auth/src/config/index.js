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
    "auth",
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

  // JWT
  jwt: {
    secret: JWTSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Cookies
  cookie: {
    secret: process.env.COOKIE_SECRET || JWTSecret,
    parseOptions: {},
    hook: false,
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge:
        parseInt(process.env.COOKIE_MAX_AGE) ||
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN) ||
        604800,
    },
  },

  // OAuth (Google & 42)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CLIENT_REDIRECT,
    },
    fortytwo: {
      clientId: process.env.FORTYTWO_CLIENT_ID,
      clientSecret: process.env.FORTYTWO_CLIENT_SECRET,
      redirectUri: process.env.FORTYTWO_CLIENT_REDIRECT,
    },
  },

  // 2FA
  twoFactor: {
    issuer: process.env.TOTP_ISSUER || "ft_transcendence",
    window: parseInt(process.env.TOTP_WINDOW || "1"),
    step: parseInt(process.env.TOTP_STEP || "30"),
    digits: parseInt(process.env.TOTP_DIGITS || "6"),
  },

  // Passwords
  password: {
    saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || "12"),
    maxFailedAttempts: parseInt(
      process.env.PASSWORD_MAX_FAILED_ATTEMPTS || "5"
    ),
    lockDuration: parseInt(process.env.PASSWORD_LOCK_DURATION || "1800"),
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
