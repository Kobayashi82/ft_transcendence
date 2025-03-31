"use strict";

const { errorResponseSchema, successResponseSchema } = require("./shared");

// Schema for listing active sessions
const listSessionsSchema = {
  description: "List all active sessions for the current user",
  tags: ["Sessions"],
  response: {
    200: {
      type: "object",
      properties: {
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              device: { type: "string" },
              ip: { type: "string" },
              location: { type: "string" },
              browser: { type: "string" },
              os: { type: "string" },
              created_at: { type: "string", format: "date-time" },
              last_active: { type: "string", format: "date-time" },
              is_current: { type: "boolean" },
            },
          },
        },
      },
    },
    401: errorResponseSchema,
  },
};

// Schema for logging out all sessions
const logoutAllSessionsSchema = {
  description:
    "Revoke all active sessions for the current user (except the current one)",
  tags: ["Sessions"],
  body: {
    type: "object",
    properties: {
      keep_current: {
        type: "boolean",
        default: true,
        description: "If true, keeps the current session active",
      },
    },
  },
  response: {
    200: successResponseSchema,
    401: errorResponseSchema,
  },
};

// Schema for revoking a specific session
const revokeSessionSchema = {
  description: "Revoke a specific session by its ID",
  tags: ["Sessions"],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: successResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

module.exports = {
  listSessionsSchema,
  logoutAllSessionsSchema,
  revokeSessionSchema,
};
