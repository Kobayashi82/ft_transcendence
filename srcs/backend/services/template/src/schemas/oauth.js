'use strict'

const { errorResponseSchema } = require('./shared');

// Schema for OAuth Init
const oauthInitSchema = {
  description: 'Initialize OAuth authentication',
  tags: ['OAuth'],
  response: {
    200: {
      type: 'object',
      properties: {
        url: { 
          type: 'string',
        }
      }
    },
    500: errorResponseSchema,
  }
}

// Schema for OAuth Callback
const oauthCallbackSchema = {
  description: 'Handle OAuth provider callback and exchange code for tokens',
  tags: ['OAuth'],
  querystring: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      state: { type: 'string' },
      error: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        token_type: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            roles: { 
              type: 'array',
              items: { type: 'string' }
            },
            has_2fa: { type: 'boolean' }
          }
        }
      }
    },
    400: errorResponseSchema,
    429: errorResponseSchema
  }
}

module.exports = { oauthInitSchema, oauthCallbackSchema }
