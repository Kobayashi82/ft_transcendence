'use strict'

// Esquema para iniciar sesión
const loginSchema = {
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
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para verificación de 2FA
const verify2FASchema = {
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
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para registro de usuario con validación de contraseña
const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      password: { 
        type: 'string', 
        minLength: 8,
        // Patrón para contraseña fuerte (sin errorMessage)
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$'
      }
    }
  },
  response: {
    201: {
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
            }
          }
        }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para refresco de token
const refreshTokenSchema = {
  body: {
    type: 'object',
    required: ['refresh_token'],
    properties: {
      refresh_token: { type: 'string' }
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
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para validación de token
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
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para recuperación de contraseña
const resetPasswordRequestSchema = {
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
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para cambio de contraseña
const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string' },
      password: { 
        type: 'string', 
        minLength: 8,
        // Patrón para contraseña fuerte (sin errorMessage)
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$'
      }
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
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para cambio de contraseña (autenticado)
const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['current_password', 'new_password'],
    properties: {
      current_password: { type: 'string' },
      new_password: { 
        type: 'string', 
        minLength: 8,
        // Patrón para contraseña fuerte (sin errorMessage)
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\\d!@#$%^&*(),.?":{}|<>]{8,}$'
      }
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
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para habilitar 2FA
const enable2FASchema = {
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
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

// Esquema para OAuth
const oauthCallbackSchema = {
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
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    429: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

module.exports = {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  validateTokenSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verify2FASchema,
  enable2FASchema,
  oauthCallbackSchema
}