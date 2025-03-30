"use strict";

module.exports = (promClient, serviceName) => {
  const dbOperationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_db_operations_total`,
    help: "Total database operations",
    labelNames: ["operation", "entity", "status"],
    registers: [register],
  });

  const dbOperationDuration = new promClient.Histogram({
    name: `${fastify.config.serviceName}_db_operation_duration_seconds`,
    help: "Duration of database operations in seconds",
    labelNames: ["operation", "entity"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5],
    registers: [register],
  });

  return {
    dbOperationsTotal,
    dbOperationDuration,

    recordOperation: (operation, entity, status) => {
      dbOperationsTotal.inc({ operation, entity, status });
    },
    recordDuration: (operation, entity, seconds) => {
      dbOperationDuration.observe({ operation, entity }, seconds);
    },
  };
};
