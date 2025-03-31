"use strict";

const { loginSchema, logoutSchema } = require("./basic");
const {
  registerSchema,
  verifyCodeSchema,
  resendCodeSchema,
} = require("./register");
const { oauthInitSchema, oauthCallbackSchema } = require("./oauth");
const {
  refreshTokenSchema,
  validateTokenSchema,
  revokeTokenSchema,
} = require("./token");
const {
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("./password");
const {
  verify2faSchema,
  enable2faSchema,
  disable2faSchema,
  regenerateBackupCodesSchema,
} = require("./twoFactor");
const {
  listSessionsSchema,
  logoutAllSessionsSchema,
  revokeSessionSchema,
} = require("./session");
const { getUserInfoSchema } = require("./user");
const { healthSchema } = require("./service");

module.exports = {
  // Authentication
  loginSchema,
  logoutSchema,

  // Registration
  registerSchema,
  verifyCodeSchema,
  resendCodeSchema,

  // OAuth
  oauthInitSchema,
  oauthCallbackSchema,

  // Tokens
  refreshTokenSchema,
  validateTokenSchema,
  revokeTokenSchema,

  // Password management
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,

  // Two-factor authentication
  verify2faSchema,
  enable2faSchema,
  disable2faSchema,
  regenerateBackupCodesSchema,

  // Session management
  listSessionsSchema,
  logoutAllSessionsSchema,
  revokeSessionSchema,

  // User information
  getUserInfoSchema,

  // Service routes
  healthSchema,
};
