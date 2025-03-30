"use strict";

// Schema for logout
const logoutSchema = {
  schema: {
    description: "Logout current user and invalidate tokens",
    tags: ["Login"],
    body: {
      type: "object",
      properties: {
        refresh_token: {
          type: "string",
          description:
            "Optional refresh token to revoke (if not provided in cookies)",
        },
      },
    },
    headers: {
      type: "object",
      properties: {
        authorization: {
          type: "string",
          description: "Bearer token to invalidate",
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          success: { type: "boolean" },
        },
      },
      500: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};

module.exports = { logoutSchema };
