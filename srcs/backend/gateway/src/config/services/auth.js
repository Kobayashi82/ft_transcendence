"use strict";

module.exports = {
  name: "auth",
  url: process.env.AUTH_SERVICE_URL || "http://auth:3000",
  prefix: "/auth",
  routes: {
    // Register and Verification
    "/register": {
      // Receives basic credentials and creates authentication record
      method: ["POST"],
      path: "/register",
      roles: [],
      authenticated: false,
    },
    "/verify-code": {
      // Verifies the code sent by email
      method: ["POST"],
      path: "/verify-code",
      roles: [],
      authenticated: false,
    },
    "/resend-code": {
      // Resends the verification code
      method: ["POST"],
      path: "/resend-code",
      roles: [],
      authenticated: false,
    },

    // Basic Authentication
    "/login": {
      // Authenticates with credentials and returns tokens
      method: ["POST"],
      path: "/login",
      roles: [],
      authenticated: false,
    },
    "/logout": {
      // Invalidates active tokens for the current session
      method: ["POST"],
      path: "/logout",
      roles: ["admin", "user"],
      authenticated: true,
    },

    // Sessions
    "/logout-all": {
      // Closes all user sessions
      method: ["POST"],
      path: "/logout-all",
      roles: ["admin", "user"],
      authenticated: true,
    },
    "/sessions": {
      // Lists active user sessions
      method: ["GET"],
      path: "/sessions",
      roles: ["admin", "user"],
      authenticated: true,
    },
    "/sessions/:id": {
      // Revokes a specific session
      method: ["DELETE"],
      path: "/sessions/:id",
      roles: ["admin", "user"],
      authenticated: true,
    },

    // Third-party Authentication
    "/oauth/google": {
      // Initiates Google authentication flow
      method: ["GET"],
      path: "/oauth/google",
      roles: [],
      authenticated: false,
    },
    "/oauth/google/callback": {
      // Callback to process Google response
      method: ["GET"],
      path: "/oauth/google/callback",
      roles: [],
      authenticated: false,
    },
    "/oauth/42": {
      // Initiates 42 authentication flow
      method: ["GET"],
      path: "/oauth/42",
      roles: [],
      authenticated: false,
    },
    "/oauth/42/callback": {
      // Callback to process 42 response
      method: ["GET"],
      path: "/oauth/42/callback",
      roles: [],
      authenticated: false,
    },

    // Account Recovery
    "/password/forgot": {
      // Initiates password recovery process
      method: ["POST"],
      path: "/password/forgot",
      roles: [],
      authenticated: false,
    },
    "/password/reset": {
      // Changes password using a recovery token
      method: ["POST"],
      path: "/password/reset",
      roles: [],
      authenticated: false,
    },
    "/password/change": {
      // Changes password for authenticated user
      method: ["POST"],
      path: "/password/change",
      roles: ["admin", "user"],
      authenticated: true,
    },

    // Two-Factor Authentication (2FA)
    "/2fa/verify": {
      // Verifies a 2FA code
      method: ["POST"],
      path: "/2fa/verify",
      roles: [],
      authenticated: false,
    },
    "/2fa/enable": {
      // Activates 2FA and generates backup codes
      method: ["POST"],
      path: "/2fa/enable",
      roles: ["admin", "user"],
      authenticated: true,
    },
    "/2fa/disable": {
      // Deactivates 2FA
      method: ["POST"],
      path: "/2fa/disable",
      roles: ["admin", "user"],
      authenticated: true,
    },
    "/2fa/codes": {
      // Regenerates backup codes
      method: ["POST"],
      path: "/2fa/codes",
      roles: ["admin", "user"],
      authenticated: true,
    },

    // Tokens
    "/validate": {
      // Validates a token
      method: ["POST"],
      path: "/validate",
      roles: [],
      authenticated: false,
    },
    "/refresh": {
      // Renews a token using the refresh token
      method: ["POST"],
      path: "/refresh",
      roles: [],
      authenticated: false,
    },
    "/revoke": {
      // Revokes a specific token
      method: ["POST"],
      path: "/revoke",
      roles: ["admin", "user"],
      authenticated: true,
    },

    // User Information
    "/me": {
      // Returns current user information
      method: ["GET"],
      path: "/me",
      roles: [],
      authenticated: true,
    },

    // Service Routes
    "/internal/health": {
      // Health check endpoint for the service
      method: ["GET"],
      path: "/internal/health",
      roles: [],
      authenticated: false,
    },
    "/openapi": {
      // OpenAPI documentation
      method: ["GET"],
      path: "/openapi",
      roles: ["admin"],
      authenticated: false,
    },
  },
  timeout: 5000,
};
