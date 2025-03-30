"use strict";

const fp = require("fastify-plugin");
const winston = require("winston");

async function loggerPlugin(fastify, options) {
  const config = fastify.config;

  // Configure Winston
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const service = fastify.config.serviceName;
        const metaWithoutServiceAndTimestamp = { ...meta };
        delete metaWithoutServiceAndTimestamp.service;
        delete metaWithoutServiceAndTimestamp.timestamp;
        const metaStr = Object.keys(metaWithoutServiceAndTimestamp).length
          ? JSON.stringify(metaWithoutServiceAndTimestamp, null, 2)
          : "";

        return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
      })
    ),
  });

  // Create Winston logger
  const winstonLogger = winston.createLogger({
    level: config.logLevel || "info",
    transports: [consoleTransport],
  });

  // Construct the logger
  const logger = {
    info: (message, meta = {}) => winstonLogger.log("info", message, meta),
    error: (message, meta = {}) => winstonLogger.log("error", message, meta),
    warn: (message, meta = {}) => winstonLogger.log("warn", message, meta),
    debug: (message, meta = {}) => winstonLogger.log("debug", message, meta),
  };

  fastify.decorate("logger", logger);
}

module.exports = fp(loggerPlugin, { name: "logger" });
