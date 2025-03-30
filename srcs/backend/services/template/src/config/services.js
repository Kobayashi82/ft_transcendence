"use strict";

// Definition of microservices
const services = {
  gateway: {
    url: process.env.GATEWAY_URL || "http://gateway:3000",
    timeout: 5000,
  },
};

module.exports = { services };
