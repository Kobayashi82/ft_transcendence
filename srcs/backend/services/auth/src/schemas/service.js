"use strict";

// Schema for Health
const healthSchema = {
  description: "Endpoint to check the status of the service",
  tags: ["System"],
  response: {
    200: {
      type: "object",
      properties: {
        service: {
          type: "object",
          properties: {
            name: { type: "string", description: "Service name" },
            status: { type: "string", description: "Service status" },
            uptime: {
              type: "number",
              description: "Time in seconds since service start",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Check timestamp",
            },
            version: { type: "string", description: "Service version" },
          },
        },
      },
    },
  },
};

module.exports = { healthSchema };
