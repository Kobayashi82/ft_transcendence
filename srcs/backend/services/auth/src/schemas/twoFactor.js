'use strict'

const { errorResponseSchema } = require('./shared');

// Schema for 2FA enabling
const enable2FASchema = {
  description: 'Enable two-factor authentication for the user',
  tags: ['2FA'],
  body: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['app', 'email', 'sms'] },
      phone: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        qrcode: { type: 'string' },
        backup_codes: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    400: errorResponseSchema,
    429: errorResponseSchema
  }
}

// Schema for 2FA verification
const verify2FASchema = {
  description: 'Verify a two-factor authentication code',
  tags: ['2FA'],
  body: {
    type: 'object',
    required: ['code', 'token'],
    properties: {
      code: { type: 'string', minLength: 6, maxLength: 10 },
      token: { type: 'string' }
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
    401: errorResponseSchema,
    429: errorResponseSchema
  }
}

module.exports = { verify2FASchema, enable2FASchema }
