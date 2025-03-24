'use strict'

const { loginSchema, oauthCallbackSchema } = require('./login');
const { registerSchema } = require('./register');
const { refreshTokenSchema, validateTokenSchema } = require('./token');
const { enable2FASchema, verify2FASchema } = require('./twoFactor');
const { resetPasswordRequestSchema, resetPasswordSchema, changePasswordSchema } = require('./password');

module.exports = {
  // Auth
  loginSchema,
  registerSchema,
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
  changePasswordSchema
};
