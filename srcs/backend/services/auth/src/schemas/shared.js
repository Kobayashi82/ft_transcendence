'use strict'

// Schema for success
const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' }
  }
}

// Schema for error
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  }
}

module.exports = { successResponseSchema, errorResponseSchema }
