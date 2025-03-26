'use strict'

const { successResponseSchema, errorResponseSchema } = require('./shared');

// Schema for password recovery
const resetPasswordRequestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' }
    }
  },
  response: {
    200: successResponseSchema,
    429: errorResponseSchema
  }
}

// Schema for password change
const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string' },
      password: { 
        type: 'string', 
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$'
      }
    }
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    429: errorResponseSchema
  }
}

// Schema for password change (authenticated)
const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['current_password', 'new_password'],
    properties: {
      current_password: { type: 'string' },
      new_password: { 
        type: 'string', 
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$'
      }
    }
  },
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    429: errorResponseSchema
  }
}

module.exports = { resetPasswordRequestSchema, resetPasswordSchema, changePasswordSchema }
