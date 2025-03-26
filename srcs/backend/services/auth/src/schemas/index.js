'use strict'

const { loginSchema, logoutSchema } = require('./login');
const { oauthInitSchema, oauthCallbackSchema } = require('./oauth');
const { registerSchema } = require('./register');
const { refreshTokenSchema, validateTokenSchema } = require('./token');
const { enable2FASchema, verify2FASchema } = require('./twoFactor');
const { resetPasswordRequestSchema, resetPasswordSchema, changePasswordSchema } = require('./password');
const { healthSchema } = require('./health');

module.exports = {
  // Auth
  loginSchema,
  logoutSchema,
  registerSchema,

  // OAuth
  oauthInitSchema,
  oauthCallbackSchema,

  // Tokens
  refreshTokenSchema,
  validateTokenSchema,
  
  // 2FA
  enable2FASchema,
  verify2FASchema,
  
  // Password
  resetPasswordRequestSchema,
  resetPasswordSchema,
  changePasswordSchema,

  // Helath
  healthSchema
};
