"use strict";

const { oauthInitSchema, oauthCallbackSchema } = require("../../schemas/oauth");

async function googleOauthRoutes(fastify, options) {
  // Google OAuth initialization
  fastify.get(
    "/oauth/google",
    { schema: oauthInitSchema },
    async (request, reply) => {
      try {
        const config = fastify.config.oauth.google;

        if (!config.clientId || !config.clientSecret) {
          fastify.logger.error("Google OAuth credentials not configured");

          reply.code(500).send({
            error: "Configuration error",
            message: "Google OAuth credentials not configured",
          });
          return;
        }

        // Generate CSRF state token
        const state = fastify.authTools.generateRandomToken(16);

        // Store state in Redis (10 minutes)
        await fastify.cache.set(`oauth:state:${state}`, "google", 600);

        // Build authorization URL
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.append("client_id", config.clientId);
        authUrl.searchParams.append("redirect_uri", config.redirectUri);
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("scope", "email profile");
        authUrl.searchParams.append("state", state);

        fastify.logger.info(`Initiating Google OAuth for IP=${request.ip}`, {
          ip: request.ip,
          state,
        });

        reply.send({ url: authUrl.toString() });
      } catch (err) {
        fastify.logger.error(`Error initiating Google OAuth: ${err.message}`, {
          error: err.message,
          stack: err.stack,
          ip: request.ip,
        });

        reply.code(500).send({
          error: "Internal error",
          message: "Error initiating OAuth",
        });
      }
    }
  );

  // Google OAuth callback
  fastify.get(
    "/oauth/google/callback",
    { schema: oauthCallbackSchema },
    async (request, reply) => {
      try {
        const { code, state, error } = request.query;

        // Check for OAuth error
        if (error) {
          fastify.logger.warn(`Google OAuth callback error: ${error}`, {
            error,
            state,
            ip: request.ip,
          });

          reply.code(400).send({
            error: "Authorization error",
            message: error,
          });
          return;
        }

        // Verify state for CSRF protection
        const storedProvider = await fastify.cache.get(`oauth:state:${state}`);
        if (!storedProvider || storedProvider !== "google") {
          fastify.logger.warn(
            `Invalid state in Google OAuth callback: ${state}`,
            {
              state,
              storedProvider,
              ip: request.ip,
            }
          );

          reply.code(400).send({
            error: "Invalid state",
            message: "Possible CSRF attack",
          });
          return;
        }

        // Remove used state
        await fastify.cache.del(`oauth:state:${state}`);

        const config = fastify.config.oauth.google;

        // Exchange code for token using circuit breaker
        let tokenResponse;
        try {
          const response = await fastify.security.breakers.googleOAuth.fire({
            method: "post",
            url: "https://oauth2.googleapis.com/token",
            data: {
              code,
              client_id: config.clientId,
              client_secret: config.clientSecret,
              redirect_uri: config.redirectUri,
              grant_type: "authorization_code",
            },
            timeout: 5000,
          });

          tokenResponse = response.data;
        } catch (err) {
          fastify.logger.error(
            `Google OAuth token exchange error: ${err.message}`,
            {
              error: err.message,
              stack: err.stack,
              ip: request.ip,
            }
          );

          if (fastify.security.breakers.googleOAuth.status === "open") {
            reply.code(503).send({
              error: "Service unavailable",
              message: "Google authentication service temporarily unavailable",
            });
          } else {
            reply.code(500).send({
              error: "Internal error",
              message: "Google OAuth callback error",
            });
          }
          return;
        }

        // Get user info using circuit breaker
        let userInfoResponse;
        try {
          userInfoResponse = await fastify.security.breakers.googleOAuth.fire({
            method: "get",
            url: "https://www.googleapis.com/oauth2/v2/userinfo",
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
            timeout: 5000,
          });
        } catch (err) {
          fastify.logger.error(
            `Error fetching Google user info: ${err.message}`,
            {
              error: err.message,
              stack: err.stack,
              ip: request.ip,
            }
          );

          reply.code(500).send({
            error: "Internal error",
            message: "Error fetching Google user data",
          });
          return;
        }

        const userInfo = userInfoResponse.data;

        fastify.logger.info(
          `User data received from Google OAuth: ${userInfo.email}`,
          {
            email: userInfo.email,
            googleId: userInfo.id,
            ip: request.ip,
          }
        );

        // Check if user exists
        let user = await fastify.authDB.getUserByOAuthId(userInfo.id, "google");

        if (!user) {
          // Check for existing email
          const existingUser = await fastify.authDB.getUserByEmail(
            userInfo.email
          );

          if (existingUser) {
            // Link existing account
            user = await fastify.authDB.updateUser(existingUser.id, {
              oauth_id: userInfo.id,
              account_type:
                existingUser.account_type === "local" ? "local" : "google",
            });

            fastify.logger.info(
              `Existing account linked with Google: ${existingUser.id}`,
              {
                userId: existingUser.id,
                email: userInfo.email,
                googleId: userInfo.id,
              }
            );
          } else {
            // Sanitize username
            const sanitizedUsername = userInfo.name
              ? fastify.security.sanitizeInput(userInfo.name)
              : userInfo.email.split("@")[0];

            // Create new user
            user = await fastify.authDB.createUser({
              email: userInfo.email,
              username: sanitizedUsername,
              account_type: "google",
              oauth_id: userInfo.id,
            });

            fastify.logger.info(
              `New user created via Google OAuth: ${user.id}`,
              {
                userId: user.id,
                email: userInfo.email,
                googleId: userInfo.id,
              }
            );
          }
        }

        // Handle 2FA if enabled
        if (user.has_2fa) {
          // Generate temporary token (valid for 5 minutes)
          const tempToken = fastify.jwt.sign({
            sub: user.id,
            email: user.email,
            temp: true,
            exp: Math.floor(Date.now() / 1000) + 300,
          });

          fastify.logger.info(
            `2FA required for Google OAuth login: ${user.id}`,
            {
              userId: user.id,
              email: user.email,
            }
          );

          reply.code(200).send({
            requires_2fa: true,
            temp_token: tempToken,
            message: "Two-factor authentication required",
          });
          return;
        }

        // Update last login
        await fastify.authDB.updateLastLogin(user.id);

        // Generate tokens
        const accessToken = fastify.authTools.generateJWT(user);
        const refreshToken = fastify.authTools.generateRefreshToken();

        // Store refresh token (7 days)
        await fastify.authDB.createRefreshToken(
          user.id,
          refreshToken,
          parseInt(fastify.config.jwt.refreshExpiresIn) || 604800
        );

        // Create session
        await fastify.authDB.createSession(
          user.id,
          fastify.authTools.generateUUID(),
          request.ip,
          request.headers["user-agent"],
          parseInt(fastify.config.jwt.refreshExpiresIn) || 604800
        );

        // Cache user info (30 minutes)
        const userInfoCache = fastify.authTools.createUserInfo(user);
        const cacheKey = `user:${user.id}:info`;
        await fastify.cache.set(cacheKey, userInfoCache, 1800);

        fastify.logger.info(`Successful Google OAuth login: ${user.id}`, {
          userId: user.id,
          email: user.email,
          ip: request.ip,
        });

        // Determine frontend host
        const frontendHost =
          request.headers["x-forwarded-host"] ||
          request.headers.host ||
          "localhost";

        // Build redirect URL
        const redirectUrl = new URL(`https://${frontendHost}/dashboard`);
        redirectUrl.searchParams.append("access_token", accessToken);
        redirectUrl.searchParams.append("refresh_token", refreshToken);
        redirectUrl.searchParams.append(
          "expires_in",
          (parseInt(fastify.config.jwt.expiresIn) || 900).toString()
        );

        // We can also include basic user data
        redirectUrl.searchParams.append("user_id", user.id);
        redirectUrl.searchParams.append(
          "username",
          encodeURIComponent(user.username)
        );
        redirectUrl.searchParams.append(
          "email",
          encodeURIComponent(user.email)
        );

        // Redirect to the frontend
        return reply.redirect(redirectUrl.toString());
      } catch (err) {
        fastify.logger.error(`Error in Google OAuth callback: ${err.message}`, {
          error: err.message,
          stack: err.stack,
          ip: request.ip,
        });

        reply.code(500).send({
          error: "Internal error",
          message: "Error in OAuth callback",
        });
      }
    }
  );
}

module.exports = googleOauthRoutes;
