"use strict";

const { errorResponseSchema } = require("./shared");

// Schema for retrieving current user information
const getUserInfoSchema = {
  description: "Retrieve information about the currently authenticated user",
  tags: ["User"],
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "number" },
        username: { type: "string" },
        email: { type: "string" },
        roles: {
          type: "array",
          items: { type: "string" },
        },
        has_2fa: { type: "boolean" },
        account_type: { type: "string" },
        profile: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            avatar_url: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        preferences: {
          type: "object",
          additionalProperties: true,
        },
        last_login: { type: "string", format: "date-time" },
        login_count: { type: "number" },
      },
    },
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

module.exports = {
  getUserInfoSchema,
};
