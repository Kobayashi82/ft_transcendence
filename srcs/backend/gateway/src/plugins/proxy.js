"use strict";

const fp = require("fastify-plugin");
const httpProxy = require("@fastify/http-proxy");

const hasRequiredRoles = (userRoles, requiredRoles) => {
  // If no roles are required, allow access
  if (!requiredRoles || requiredRoles.length === 0) return true;

  // If roles are required but user has no roles, deny access
  if (!userRoles || userRoles.length === 0) return false;

  // if user has at least one of the required roles
  return userRoles.some((role) => requiredRoles.includes(role));
};

const getAllowedHttpMethods = (routes) => {
  // Default methods to allow if no specific methods defined
  const defaultMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

  // If no routes defined, use default methods
  if (!routes || Object.keys(routes).length === 0) return defaultMethods;

  const methods = new Set();

  // Always include OPTIONS
  methods.add("OPTIONS");

  // Add methods from route configurations
  for (const routeConfig of Object.values(routes)) {
    if (typeof routeConfig === "object" && routeConfig.method) {
      const methodArray = Array.isArray(routeConfig.method)
        ? routeConfig.method
        : [routeConfig.method];
      methodArray.forEach((method) => methods.add(method.toUpperCase()));
    }
  }

  // If no methods defined, use default methods
  if (methods.size <= 1) return defaultMethods;

  return Array.from(methods);
};

// Plugin to route requests to the corresponding services
async function proxyPlugin(fastify, options) {
  const { services, routeMap } = fastify.config;

  // Add a preHandler hook to check roles before proxying
  fastify.addHook("preHandler", async (request, reply) => {
    const url = request.url;
    const method = request.method;

    // Find matching service prefix
    let serviceName = null;
    let prefix = null;

    for (const [routePrefix, svcName] of Object.entries(routeMap)) {
      if (url.startsWith(routePrefix)) {
        prefix = routePrefix;
        serviceName = svcName;
        break;
      }
    }

    // Not a proxied route, continue to next handler
    if (!serviceName || !services[serviceName]) return;

    // Get service and route configuration
    const service = services[serviceName];
    const routePath = url.substring(prefix.length).split("?")[0]; // Remove query params

    // Find matching route, required roles and methods
    let requiredRoles = [];
    let allowedMethods = null;
    let authRequired = true; // Default to requiring auth for security

    if (service.routes && service.routes[routePath]) {
      const routeConfig = service.routes[routePath];

      if (typeof routeConfig === "object") {
        // Get required roles
        requiredRoles = routeConfig.roles || [];

        // Check if authentication is required
        if (routeConfig.authenticated !== undefined) {
          authRequired = routeConfig.authenticated;
        }

        // Get required methods
        if (routeConfig.method) {
          allowedMethods = Array.isArray(routeConfig.method)
            ? routeConfig.method.map((m) => m.toUpperCase())
            : [routeConfig.method.toUpperCase()];
        }
      }
    }

    // Check if the method is allowed
    if (allowedMethods && !allowedMethods.includes(method)) {
      // Log attempt of a non-allowed method
      fastify.logger.warn("Method not allowed", {
        url: request.url,
        method: request.method,
        allowedMethods: allowedMethods.join(", "),
        service: serviceName,
      });

      reply.code(405).send({
        statusCode: 405,
        error: "Method Not Allowed",
        message: `This endpoint only accepts ${allowedMethods.join(
          ", "
        )} requests`,
      });
      return reply;
    }

    // Check if authentication is required
    if (authRequired && (!request.auth || !request.auth.authenticated)) {
      fastify.logger.warn("Authentication required", {
        url: request.url,
        method: request.method,
        service: serviceName,
      });

      reply.code(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required for this resource",
      });
      return reply;
    }

    // Only check roles if authentication is required
    if (authRequired) {
      // Get user roles
      let userRoles = request.auth?.roles || [];

      // Check if user has required roles
      if (!hasRequiredRoles(userRoles, requiredRoles)) {
        // Log failed role verification
        fastify.logger.warn("Insufficient permissions", {
          url: request.url,
          method: request.method,
          requiredRoles: requiredRoles,
          service: serviceName,
        });

        reply.code(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Insufficient permissions to access this resource",
        });
        return reply;
      }
    }
  });

  // Register a proxy for each service
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    const {
      url,
      prefix,
      routes = {},
      proxyOptions = {},
      timeout,
    } = serviceConfig;

    // Determine allowed HTTP methods
    const httpMethods = getAllowedHttpMethods(routes);

    fastify.register(httpProxy, {
      upstream: url,
      prefix: prefix,
      http2: false,

      // Add preValidation to validate routes
      preValidation: (request, reply, done) => {
        // Get the route path by removing the prefix from the URL
        const routePath = request.url.substring(prefix.length).split("?")[0];

        // Check if the route is defined in the service configuration
        if (!routes[routePath]) {
          fastify.logger.warn("Route not found", {
            url: request.url,
            routePath: routePath,
            service: serviceName,
          });

          return reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: `Route ${routePath} not found`,
          });
        }

        done();
      },

      replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
          // Add relevant headers
          headers["x-forwarded-proto"] = req.protocol;
          headers["x-forwarded-host"] = req.headers.host;

          // Custom headers to identify requests
          headers["x-source"] = "gateway";
          headers["x-target"] = serviceName;
          headers["x-request-id"] = fastify.generateId();
          headers["x-gateway-timestamp"] = Date.now().toString();

          // Add user information to the request
          if (req.auth && req.auth.authenticated) {
            headers["x-user-id"] = req.auth.userId.toString();
            headers["x-user-roles"] = JSON.stringify(req.auth.roles);
          }

          // Apply custom header rewrites specific to the service
          if (proxyOptions.rewriteRequestHeaders)
            headers = proxyOptions.rewriteRequestHeaders(req, headers);

          return headers;
        },
      },
      httpMethods: httpMethods,
      timeout: timeout,
      ...proxyOptions,
    });
  }

  // Capture proxy errors
  fastify.setErrorHandler((error, request, reply) => {
    // Handle timeout errors
    if (error.code === "ETIMEDOUT") {
      fastify.logger.error("Service timeout", {
        error: error.message,
        service: request.headers["x-target"],
      });

      reply.status(408).send({
        statusCode: 408,
        error: "Request Timeout",
        message: "Service took too long to respond",
      });
      return;
    }

    // Handle connection errors
    if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
      fastify.logger.error("Service Unavailable", {
        error: error.message,
        service: request.headers["x-target"],
      });

      reply.status(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message: "Service temporarily unavailable",
      });
      return;
    }

    // For other errors, delegate to the global error handler
    reply.send(error);
  });
}

module.exports = fp(proxyPlugin, {
  name: "proxy",
  dependencies: ["logger", "auth"],
});
