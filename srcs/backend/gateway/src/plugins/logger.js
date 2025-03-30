"use strict";

const fp = require("fastify-plugin");
const winston = require("winston");
const net = require("net");

/**
 * Logging plugin for the Gateway
 * - Logs to console with nice formatting
 * - Sends logs to Logstash if available
 * - Provides endpoints to receive logs from microservices
 * - Tracks metrics about logging activities
 */
async function loggerPlugin(fastify, options) {
  const config = fastify.config;
  const serviceName = config.serviceName;

  // Configure Winston
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const service = meta.service || serviceName;
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

  // Configure direct TCP connection to Logstash
  let logstashClient = null;
  let logstashConnected = false;

  const host = fastify.config.logstash.host;
  const port = parseInt(fastify.config.logstash.port);

  try {
    logstashClient = new net.Socket();

    logstashClient.on("connect", () => {
      logstashConnected = true;
      // Record successful Logstash connection
      if (fastify.metrics && fastify.metrics.logging) {
        fastify.metrics.logging.logsSentToLogstash.inc(0);
      }
    });

    logstashClient.on("close", () => {
      logstashConnected = false;
      setTimeout(() => {
        logstashClient.connect(port, host);
      }, 5000);
      // Record Logstash disconnection
      if (fastify.metrics && fastify.metrics.logging) {
        fastify.metrics.logging.recordSendFailure();
      }
    });

    logstashClient.on("error", (err) => {
      logstashConnected = false;
      // Record Logstash connection error
      if (fastify.metrics && fastify.metrics.logging) {
        fastify.metrics.logging.recordSendFailure();
      }
    });

    logstashClient.connect(port, host);
  } catch (err) {
    // Record Logstash initialization error
    if (fastify.metrics && fastify.metrics.logging) {
      fastify.metrics.logging.recordSendFailure();
    }
  }

  // Function to send logs to Logstash
  const sendToLogstash = (level, message, meta = {}) => {
    if (!logstashConnected || !logstashClient) return;

    try {
      const logData = {
        "@timestamp": new Date().toISOString(),
        service: meta.service || serviceName,
        env: config.env || "production",
        host: meta.host || config.host || "gateway",
        level,
        message,
        ...meta,
      };

      // Send to Logstash
      const logString = JSON.stringify(logData) + "\n";
      const byteSize = Buffer.byteLength(logString, "utf8");

      logstashClient.write(logString);

      // Record metrics for successful log sending
      if (fastify.metrics && fastify.metrics.logging) {
        fastify.metrics.logging.recordLogsSent(1);
        fastify.metrics.logging.recordBatchSize(byteSize);
      }
    } catch (err) {
      // Record Logstash send error
      if (fastify.metrics && fastify.metrics.logging) {
        fastify.metrics.logging.recordSendFailure();
      }
    }
  };

  // Construct the logger object
  const logger = {
    info: (message, meta = {}) => winstonLogger.log("info", message, meta),
    error: (message, meta = {}) => winstonLogger.log("error", message, meta),
    warn: (message, meta = {}) => winstonLogger.log("warn", message, meta),
    debug: (message, meta = {}) => winstonLogger.log("debug", message, meta),
    trace: (message, meta = {}) => winstonLogger.log("trace", message, meta),

    logstash: {
      info: (data, msg) => {
        if (typeof data === "object" && data.message && !msg)
          sendToLogstash("info", data.message, data);
        else sendToLogstash("info", msg || "Info log", data);
      },
      error: (data, msg) => {
        if (typeof data === "object" && data.message && !msg)
          sendToLogstash("error", data.message, data);
        else sendToLogstash("error", msg || "Error log", data);
      },
      warn: (data, msg) => {
        if (typeof data === "object" && data.message && !msg)
          sendToLogstash("warn", data.message, data);
        else sendToLogstash("warn", msg || "Warning log", data);
      },
      debug: (data, msg) => {
        if (typeof data === "object" && data.message && !msg)
          sendToLogstash("debug", data.message, data);
        else sendToLogstash("debug", msg || "Debug log", data);
      },
    },
  };

  // Logger for local
  const logger_local = {
    info: (message, meta = {}) => winstonLogger.log("info", message, meta),
    error: (message, meta = {}) => winstonLogger.log("error", message, meta),
    warn: (message, meta = {}) => winstonLogger.log("warn", message, meta),
    debug: (message, meta = {}) => winstonLogger.log("debug", message, meta),
    trace: (message, meta = {}) => winstonLogger.log("trace", message, meta),
  };

  // Register endpoints to receive logs from services
  fastify.post("/internal/logs", async (request, reply) => {
    const { level, message, meta = {}, service, timestamp } = request.body;

    // Record metric for received log
    if (fastify.metrics && fastify.metrics.logging) {
      fastify.metrics.logging.recordLogsProcessed(
        service || "unknown",
        level || "info"
      );
    }

    sendToLogstash(level, message, { ...meta, service, timestamp });
    return { success: true };
  });

  fastify.post("/internal/logs/batch", async (request, reply) => {
    const { logs, service } = request.body;

    if (Array.isArray(logs)) {
      // Record batch metrics
      if (fastify.metrics && fastify.metrics.logging) {
        // Calculate batch size
        const batchSize = Buffer.byteLength(JSON.stringify(logs), "utf8");
        fastify.metrics.logging.recordBatchSize(batchSize);

        // Create map to count logs by service and level
        const logCounts = {};

        for (const entry of logs) {
          const entryService = entry.service || service || "unknown";
          const entryLevel = entry.level || "info";

          if (!logCounts[entryService]) {
            logCounts[entryService] = {};
          }

          if (!logCounts[entryService][entryLevel]) {
            logCounts[entryService][entryLevel] = 0;
          }

          logCounts[entryService][entryLevel]++;
        }

        // Record aggregated metrics
        for (const [svc, levels] of Object.entries(logCounts)) {
          for (const [lvl, count] of Object.entries(levels)) {
            fastify.metrics.logging.recordLogsProcessed(svc, lvl, count);
          }
        }
      }

      // Process each log in the batch
      for (const entry of logs) {
        sendToLogstash(entry.level, entry.message, {
          ...entry.meta,
          service: entry.service || service,
          timestamp: entry.timestamp,
        });
      }
    }

    return { success: true, count: logs ? logs.length : 0 };
  });

  fastify.decorate("logger", logger);
  fastify.decorate("logger_local", logger_local);
}

module.exports = fp(loggerPlugin, {
  name: "logger",
  dependencies: ["metrics"],
});
