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

const shutdown = async () => {
  try {
    await app.close();
    console.log('Server shut down successfully');
    process.exit(0);
  } catch (err) {
    console.error('Server shutdown failure');
    process.exit(1);
  }
}

const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: config.port, host: config.host });
    console.log('Server ready');
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error('Server failed', err);
    process.exit(1);
  }
}

start();