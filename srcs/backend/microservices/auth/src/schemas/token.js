'use strict'

const { errorResponseSchema } = require('./shared');

// Schema for token refresh
const refreshTokenSchema = {
  body: {
    type: 'object',
    required: [],
    properties: {
      refresh_token: { type: 'string' },
      device_id: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        token_type: { type: 'string' }
      }
    },
    401: errorResponseSchema,
    429: errorResponseSchema
  }
}

// Schema for token validation
const validateTokenSchema = {
  headers: {
    type: 'object',
    properties: {
      authorization: { type: 'string' }
    },
    required: ['authorization']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        user_info: {
          type: 'object',
          properties: {
            user_id: { type: 'number' },
            email: { type: 'string' },
            username: { type: 'string' },
            roles: { 
              type: 'array',
              items: { type: 'string' }
            },
            has_2fa: { type: 'boolean' },
            account_type: { type: 'string' },
            last_login: { type: 'string' },
            created_at: { type: 'string' },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    401: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: errorResponseSchema
  }
}

module.exports = { refreshTokenSchema, validateTokenSchema }
