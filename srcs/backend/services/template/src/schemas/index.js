"use strict";

const { loginSchema } = require("./login");
const { logoutSchema } = require("./logout");
const { registerSchema } = require("./register");
const { oauthInitSchema, oauthCallbackSchema } = require("./oauth");
const { refreshTokenSchema, validateTokenSchema } = require("./token");
const { healthSchema } = require("./health");

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

  // Helath
  healthSchema,
};
