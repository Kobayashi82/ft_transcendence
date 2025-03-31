"use strict";

const { errorResponseSchema, successResponseSchema } = require("./shared");

// Schema for password forgot (reset request)
const forgotPasswordSchema = {
  description: "Request a password reset link via email",
  tags: ["Password"],
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

// Schema for password reset (with token)
const resetPasswordSchema = {
  description: "Reset password using the token received via email",
  tags: ["Password"],
  body: {
    type: "object",
    required: ["token", "password"],
    properties: {
      token: { type: "string" },
      password: {
        type: "string",
        minLength: 8,
        pattern:
          '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$',
      },
      confirmPassword: { type: "string" },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

// Schema for password change (when authenticated)
const changePasswordSchema = {
  description: "Change password for authenticated user",
  tags: ["Password"],
  body: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: { type: "string" },
      newPassword: {
        type: "string",
        minLength: 8,
        pattern:
          '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$',
      },
      confirmPassword: { type: "string" },
    },
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
