'use strict'

const { errorResponseSchema } = require('./shared');

// Schema for login
const loginSchema = {
  description: 'Authenticate a user and return access tokens',
  tags: ['Login'],
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
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
    401: errorResponseSchema,
    429: errorResponseSchema
  }
}

const logoutSchema = {
  schema: {
    description: 'Logout current user and invalidate tokens',
    tags: ['Login'],
    body: {
      type: 'object',
      properties: {
        refresh_token: { 
          type: 'string', 
          description: 'Optional refresh token to revoke (if not provided in cookies)'
        }
      }
    },
    headers: {
      type: 'object',
      properties: {
        authorization: {
          type: 'string',
          description: 'Bearer token to invalidate',
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' }
        }
      },
      500: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }
}

module.exports = { loginSchema, logoutSchema }
