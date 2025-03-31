"use strict";

const { errorResponseSchema, successResponseSchema } = require("./shared");

// Schema for user registration
const registerSchema = {
  description: "Register a new user and return access tokens",
  tags: ["Register"],
  body: {
    type: "object",
    required: ["username", "email", "password"],
    properties: {
      username: { type: "string", minLength: 3 },
      email: { type: "string", format: "email" },
      password: {
        type: "string",
        minLength: 8,
        pattern:
          '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$',
      },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        expires_in: { type: "number" },
        token_type: { type: "string" },
        user: {
          type: "object",
          properties: {
            id: { type: "number" },
            username: { type: "string" },
            email: { type: "string" },
            roles: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    400: errorResponseSchema,
    409: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for verifying email code
const verifyCodeSchema = {
  description: "Verify email using verification code",
  tags: ["Verification"],
  body: {
    type: "object",
    required: ["code"],
    properties: {
      code: { type: "string" },
      email: { type: "string", format: "email" },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    410: {
      type: "object",
      properties: {
        error: { type: "string" },
        message: { type: "string" },
        expired: { type: "boolean" },
      },
    },
  },
};

// Schema for resending verification code
const resendCodeSchema = {
  description: "Resend verification code to email",
  tags: ["Verification"],
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    429: errorResponseSchema,
  },
};

module.exports = { registerSchema, verifyCodeSchema, resendCodeSchema };
