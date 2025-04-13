"use strict";

const config = require("./config");
const fastify = require("fastify");
const app = fastify();

const gameManager = require('./plugins/game-manager');
const tournamentManager = require('./plugins/tournament-manager');
tournamentManager.setGameManager(gameManager);

app.decorate("config", config);
app.register(require('@fastify/websocket'));
app.register(require("./plugins/error-handler"));
app.register(require("./routes"));
app.register(require("./plugins/websocket-handler"));

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
    console.error('Server failed', err);
    process.exit(1);
  }
};

start();