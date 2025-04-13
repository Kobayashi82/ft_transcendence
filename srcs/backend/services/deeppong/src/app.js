"use strict";

const config = require("./config");
const fastify = require("fastify");
const app = fastify();

app.decorate("config", config);

app.register(require("./plugins/error-handler"));
// Register AI controller plugin first so it's available for routes
app.register(require("./plugins/ai-controller"));
app.register(require("./routes"));

// Shutdown
const gracefulShutdown = async () => {
  try {
    await app.close();
    console.log('Server shut down successfully');
    process.exit(0);
  } catch (err) {
    console.error('Server shutdown failure');
    process.exit(1);
  }
};

// Start
const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: config.port, host: config.host });
    console.log('Server ready');

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error('Server failed');
    process.exit(1);
  }
};

start();
