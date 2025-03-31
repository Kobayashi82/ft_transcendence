"use strict";

const { errorResponseSchema, successResponseSchema } = require("./shared");

// Schema for token refresh
const refreshTokenSchema = {
  description: "Refresh the access token using the provided refresh token",
  tags: ["Tokens"],
  body: {
    type: "object",
    required: [],
    properties: {
      refresh_token: { type: "string" },
      device_id: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        expires_in: { type: "number" },
        token_type: { type: "string" },
      },
    },
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for token validation
const validateTokenSchema = {
  description: "Validate the provided token and return user information",
  tags: ["Tokens"],
  headers: {
    type: "object",
    properties: {
      authorization: { type: "string" },
    },
    required: ["authorization"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        user_info: {
          type: "object",
          properties: {
            user_id: { type: "number" },
            email: { type: "string" },
            username: { type: "string" },
            roles: {
              type: "array",
              items: { type: "string" },
            },
            has_2fa: { type: "boolean" },
            account_type: { type: "string" },
            last_login: { type: "string" },
            created_at: { type: "string" },
            is_active: { type: "boolean" },
          },
        },
      },
    },
    401: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        error: { type: "string" },
        message: { type: "string" },
      },
    },
    429: errorResponseSchema,
  },
};

// Schema for token revocation
const revokeTokenSchema = {
  description: "Revoke a specific token",
  tags: ["Tokens"],
  body: {
    type: "object",
    required: ["token"],
    properties: {
      token: {
        type: "string",
        description: "The token to revoke",
      },
      token_type: {
        type: "string",
        enum: ["access", "refresh"],
        default: "access",
        description: "Type of token to revoke",
      },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

module.exports = { refreshTokenSchema, validateTokenSchema, revokeTokenSchema };
