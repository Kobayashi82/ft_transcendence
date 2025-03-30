module.exports = (promClient, serviceName) => {
  const loginAttemptsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_login_attempts_total`,
    help: "Total login attempts",
    labelNames: ["status", "method"],
    registers: [register],
  });

  const registrationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_registrations_total`,
    help: "Total user registrations",
    labelNames: ["status", "method"],
    registers: [register],
  });

  const tokenValidationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_token_validations_total`,
    help: "Total token validations",
    labelNames: ["status"],
    registers: [register],
  });

  const twoFactorAuthTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_2fa_attempts_total`,
    help: "Total 2FA verification attempts",
    labelNames: ["status", "type"],
    registers: [register],
  });

  const activeUsersGauge = new promClient.Gauge({
    name: `${fastify.config.serviceName}_active_users`,
    help: "Number of active users",
    registers: [register],
  });

  const activeSessionsGauge = new promClient.Gauge({
    name: `${fastify.config.serviceName}_active_sessions`,
    help: "Number of active user sessions",
    registers: [register],
  });

  const tokenOperationsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_token_operations_total`,
    help: "Total token operations",
    labelNames: ["operation", "type"],
    registers: [register],
  });

  const securityEventsTotal = new promClient.Counter({
    name: `${fastify.config.serviceName}_security_events_total`,
    help: "Total security events",
    labelNames: ["type", "status"],
    registers: [register],
  });

  return {
    loginAttemptsTotal,
    registrationsTotal,
    tokenValidationsTotal,
    twoFactorAuthTotal,
    activeUsersGauge,
    activeSessionsGauge,
    tokenOperationsTotal,
    securityEventsTotal,

    loginAttempts: (status, method = "local") => {
      loginAttemptsTotal.inc({ status, method });
    },
    registrations: (status, method = "local") => {
      registrationsTotal.inc({ status, method });
    },
    tokenValidations: (status) => {
      tokenValidationsTotal.inc({ status });
    },
    twoFactorAuth: (status, type = "app") => {
      twoFactorAuthTotal.inc({ status, type });
    },
    setActiveUsers: (count) => {
      activeUsersGauge.set(count);
    },
    setActiveSessions: (count) => {
      activeSessionsGauge.set(count);
    },
    recordTokenOperation: (operation, type) => {
      tokenOperationsTotal.inc({ operation, type });
    },
    recordSecurityEvent: (type, status) => {
      securityEventsTotal.inc({ type, status });
    },
  };
};
