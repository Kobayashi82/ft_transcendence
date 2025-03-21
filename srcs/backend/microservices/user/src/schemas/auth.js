'use strict'

/**
 * Esquemas de validación para autenticación
 */

// Esquema para iniciar sesión
const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            roles: { 
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
}

// Esquema para registro de usuario
const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        username: { type: 'string' },
        email: { type: 'string' }
      }
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
}

// Esquema para verificación de token
const verifyTokenSchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            roles: { 
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }
}

// Esquema para recuperación de contraseña
const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
}

module.exports = {
  loginSchema,
  registerSchema,
  verifyTokenSchema,
  resetPasswordSchema
}
