"use strict";

const fastify = require("fastify");
const config = require("./config");

const app = fastify({ logger: false, trustProxy: true });

app.decorate("config", config);

app.register(require("@fastify/swagger"), { swagger: config.swagger });
app.register(require("@fastify/redis"), config.redis);

app.register(require("./plugins/metrics"));
app.register(require("./plugins/logger"));
app.register(require("./plugins/db"), { database: config.database });

app.register(require("./plugins/error-handler"));
app.register(require("./routes"), { prefix: "" });

// Shutdown
const gracefulShutdown = async () => {
  try {
    await app.close();
    console.log(
      new Date().toISOString(),
      "\x1b[32minfo\x1b[0m Server shut down successfully"
    );
    process.exit(0);
  } catch (err) {
    console.error(
      new Date().toISOString(),
      "\x1b[31merror\x1b[0m Server shutdown failure:"
    );
    process.exit(1);
  }
};

// Start
const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: config.port, host: config.host });
    console.log(
      new Date().toISOString(),
      `[${config.serviceName}] \x1b[32minfo\x1b[0m: Server ready`
    );

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error(
      new Date().toISOString(),
      `[${config.serviceName}] Server failed`
    );
    process.exit(1);
  }
};

start();
