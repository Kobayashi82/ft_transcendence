"use strict";

const fp = require("fastify-plugin");

// Authentication plugin that verifies JWTs and adds auth info to requests
async function authPlugin(fastify, options) {
  // Add auth information decorator
  fastify.decorateRequest("auth", null);

  // Add an onRequest hook to verify JWT tokens
  fastify.addHook("onRequest", async (request, reply) => {
    // Default auth state
    request.auth = { authenticated: false, roles: [] };

    // Extract token from Authorization header
    let token = null;

    if (
      request.headers.authorization &&
      request.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      token = request.headers.authorization.split(" ")[1];
    }

    if (!token) return;

    // Check if token is blacklisted in Redis
    try {
      const isBlacklisted = await fastify.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        // Token has been logged out

        fastify.logger.debug("Blacklisted token used", {
          ip: request.ip,
          url: request.url,
        });

        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Token has been invalidated",
        });
      }
    } catch (redisError) {
      fastify.logger.error("Redis blacklist check failed", {
        error: redisError.message,
      });
    }

    try {
      // Verify the token
      const decoded = await request.jwtVerify();

      // Set up authentication info
      request.auth = {
        authenticated: true,
        userId: decoded.sub || decoded.userId,
        roles: decoded.roles || [],
        email: decoded.email,
      };
    } catch (err) {
      // JWT verification errors
      let errorType = "unknown";

      if (err.code === "FAST_JWT_EXPIRED") {
        errorType = "expired_token";
      } else if (err.code === "FAST_JWT_MALFORMED") {
        errorType = "malformed_token";
      } else if (err.code === "FAST_JWT_INVALID_SIGNATURE") {
        errorType = "invalid_signature";
      }

      // Authentication error
      fastify.logger.debug(`Token validation failed: ${err.message}`, {
        error: err.message,
        code: err.code,
        ip: request.ip,
        url: request.url,
      });

      // Return appropriate error based on JWT failure
      if (err.code === "FAST_JWT_EXPIRED") {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Token has expired",
        });
      } else {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid authentication token",
        });
      }
    }
  });
}

module.exports = fp(authPlugin, {
  name: "auth",
  dependencies: ["@fastify/jwt", "@fastify/redis", "logger"],
});
