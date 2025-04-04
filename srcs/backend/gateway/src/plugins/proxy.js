"use strict";

const fp = require("fastify-plugin");
const httpProxy = require("@fastify/http-proxy");

// Helper function to check if a route matches a pattern with parameters
function routeMatches(route, pattern) {
  // Exact match
  if (route === pattern) return true;
  
  // Split both into segments
  const routeSegments = route.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);
  
  // Different number of segments means no match
  if (routeSegments.length !== patternSegments.length) return false;
  
  // Check segment by segment
  for (let i = 0; i < routeSegments.length; i++) {
    // If pattern segment starts with :, it's a parameter and matches anything
    if (patternSegments[i].startsWith(':')) continue;
    
    // Otherwise segments must match exactly
    if (routeSegments[i] !== patternSegments[i]) return false;
  }
  
  return true;
}

const getAllowedHttpMethods = (routes) => {
  // Default methods
  const defaultMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

  // If no routes defined, use default methods
  if (!routes || Object.keys(routes).length === 0) return defaultMethods;

  const methods = new Set();

  // Always include OPTIONS
  methods.add("OPTIONS");

  // Add methods from service configurations
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

async function proxyPlugin(fastify, options) {
  const { services, routeMap } = fastify.config;
  const wsProxies = {};
  const activeConnections = new Map();

  // Add a preHandler hook to check allowed methods
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
    const routePath = url.substring(prefix.length).split("?")[0];

    // Find matching route and methods
    let allowedMethods = null;
    let matchFound = false;

    // Check for exact route match
    if (service.routes && service.routes[routePath]) {
      const routeConfig = service.routes[routePath];
      matchFound = true;

      if (typeof routeConfig === "object") {
         // Get required methods
        if (routeConfig.method) {
          allowedMethods = Array.isArray(routeConfig.method)
            ? routeConfig.method.map((m) => m.toUpperCase())
            : [routeConfig.method.toUpperCase()];
        }
      }
    } else if (service.routes) {
      // Check for pattern matches (routes with parameters)
      for (const [pattern, routeConfig] of Object.entries(service.routes)) {
        if (routeMatches(routePath, pattern)) {
          matchFound = true;
          
          if (typeof routeConfig === "object" && routeConfig.method) {
            allowedMethods = Array.isArray(routeConfig.method)
              ? routeConfig.method.map((m) => m.toUpperCase())
              : [routeConfig.method.toUpperCase()];
          }
          break;
        }
      }
    }

    // If route not found and no wildcard routes
    if (!matchFound && !service.routes["*"] && !service.routes["/*"]) {
      // Log attempt to access undefined route
      console.warn("Route not found", {
        url: request.url,
        routePath: routePath,
        service: serviceName,
      });

      reply.code(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Route ${routePath} not found`,
      });
      return reply;
    }

    // Check if the method is allowed
    if (allowedMethods && !allowedMethods.includes(method)) {
      // Log attempt of a non-allowed method
      console.warn("Method not allowed", {
        url: request.url,
        method: request.method,
        allowedMethods: allowedMethods.join(", "),
        service: serviceName,
      });

      reply.code(405).send({
        statusCode: 405,
        error: "Method Not Allowed",
        message: `This endpoint only accepts ${allowedMethods.join(", ")} requests`,
      });
      return reply;
    }
  });

  // Register a proxy for each service
  for (const [serviceName, serviceConfig] of Object.entries(services)) {
    const {
      url: serviceUrl,
      prefix,
      routes = {},
      proxyOptions = {},
      wsEnabled = false,
      wsPath = prefix,
      timeout,
    } = serviceConfig;

    // Determine allowed HTTP methods
    const httpMethods = getAllowedHttpMethods(routes);

    fastify.register(httpProxy, {
      upstream: serviceUrl,
      prefix: prefix,
      http2: false,

      replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
          // Add relevant headers
          headers["x-forwarded-proto"] = req.protocol;
          headers["x-forwarded-host"] = req.headers.host;

          // Custom headers to identify requests
          headers["x-source"] = "gateway";
          headers["x-target"] = serviceName;
          headers["x-request-id"] = `${req.ip.replace(/[.:]/g, '-')}_${req.url.replace(/[\/?.]/g, '-')}_${Date.now()}`;
          headers["x-gateway-timestamp"] = Date.now().toString();

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

    // Set up WebSocket proxy for this service if enabled
    if (wsEnabled) {
      const parsedUrl = new URL(serviceUrl);
      wsProxies[wsPath] = {
        target: {
          host: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          protocol: parsedUrl.protocol
        },
        serviceName,
        serviceUrl
      };
    }
  }

  // Handle WebSocket upgrade requests
  fastify.server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    
    // Find the matching WebSocket proxy for this path
    const matchingProxy = Object.entries(wsProxies).find(([path, _]) => pathname.startsWith(path));
    if (!matchingProxy) {
      socket.destroy();
      return;
    }

    const [_, proxyInfo] = matchingProxy;
    const { target, serviceName, serviceUrl } = proxyInfo;
    const requestId = `${request.socket.remoteAddress.replace(/[.:]/g, '-')}_${pathname.replace(/[\/?.]/g, '-')}_${Date.now()}`;
    
    // Create headers
    const headers = {
      ...request.headers,
      'x-source': 'gateway',
      'x-target': serviceName,
      'x-request-id': requestId,
      'x-gateway-timestamp': Date.now().toString()
    };

    // Determine which module to use based on protocol
    const httpModule = target.protocol === 'https:' ? require('https') : require('http');

    // Create options
    const options = {
      host: target.host,
      port: target.port,
      path: pathname,
      headers: headers,
      method: 'GET'
    };

    // Create a proxy request
    const proxyReq = httpModule.request(options);
    
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      // Connection established with the target
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: ${proxyRes.headers.upgrade}\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${proxyRes.headers['sec-websocket-accept']}\r\n` +
        `\r\n`
      );

      // Create connection object
      const connectionId = `${requestId}_${Date.now()}`;
      const connection = {
        id: connectionId,
        clientSocket: socket,
        serviceSocket: proxySocket,
        service: serviceName,
        path: pathname,
        clientIp: request.socket.remoteAddress,
        connectedAt: new Date(),
      };
      
      // Store in active connections map
      activeConnections.set(connectionId, connection);

      // Connect the client socket with the target socket
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);

      // Handle errors and connection close
      proxySocket.on('error', (err) => {
        console.error(`WebSocket proxy target error for ${serviceName}:`, err, { connectionId });
        socket.destroy();
        cleanupConnection(connectionId);
      });

      socket.on('error', (err) => {
        console.error(`WebSocket client error for ${serviceName}:`, err, { connectionId });
        proxySocket.destroy();
        cleanupConnection(connectionId);
      });
      
      // Handle connection close from either side
      const closeHandler = () => {
        cleanupConnection(connectionId);
      };
      
      proxySocket.on('close', closeHandler);
      socket.on('close', closeHandler);
    });

    proxyReq.on('error', (err) => {
      console.error(`Failed to proxy WebSocket for ${serviceName}:`, err);
      socket.destroy();
    });

    proxyReq.end();
  });

  // Helper function to clean up a connection
  function cleanupConnection(connectionId) {
    if (activeConnections.has(connectionId)) {
      activeConnections.delete(connectionId);
    }
  }

  // Capture proxy errors
  fastify.setErrorHandler((error, request, reply) => {
    // Handle timeout errors
    if (error.code === "ETIMEDOUT") {
      console.error("Service timeout", {
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
      console.error("Service Unavailable", {
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

module.exports = fp(proxyPlugin, { name: "proxy" });