"use strict";

const { errorResponseSchema, successResponseSchema } = require("./shared");

// Schema for 2FA verification
const verify2faSchema = {
  description: "Verify a 2FA code",
  tags: ["2FA"],
  body: {
    type: "object",
    required: ["code"],
    properties: {
      code: { type: "string", minLength: 6, maxLength: 6 },
      remember_device: { type: "boolean" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        access_token: { type: "string" },
        refresh_token: { type: "string" },
        expires_in: { type: "number" },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for enabling 2FA
const enable2faSchema = {
  description: "Enable two-factor authentication for the user account",
  tags: ["2FA"],
  body: {
    type: "object",
    properties: {
      password: { type: "string" },
    },
    required: ["password"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        secret: { type: "string" },
        qr_code: { type: "string" },
        backup_codes: {
          type: "array",
          items: { type: "string" },
        },
        setup_required: { type: "boolean" },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for disabling 2FA
const disable2faSchema = {
  description: "Disable two-factor authentication for the user account",
  tags: ["2FA"],
  body: {
    type: "object",
    required: ["password"],
    properties: {
      password: { type: "string" },
      code: { type: "string", minLength: 6, maxLength: 6 },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for regenerating backup codes
const regenerateBackupCodesSchema = {
  description: "Regenerate backup codes for 2FA",
  tags: ["2FA"],
  body: {
    type: "object",
    required: ["password"],
    properties: {
      password: { type: "string" },
      code: { type: "string", minLength: 6, maxLength: 6 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        backup_codes: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

module.exports = {
  verify2faSchema,
  enable2faSchema,
  disable2faSchema,
  regenerateBackupCodesSchema,
};
