'use strict'

/**
 * Esquemas de validación para usuarios
 */

// Definición de esquema base para un usuario
const userProperties = {
  id: { type: 'number' },
  username: { type: 'string', minLength: 3 },
  email: { type: 'string', format: 'email' },
  created_at: { type: 'string' },
  roles: { 
    type: 'array',
    items: { type: 'string' }
  }
}

// Esquema para crear un usuario
const createUserSchema = {
  body: {
    type: 'object',
    required: ['username', 'email'],
    properties: {
      username: userProperties.username,
      email: userProperties.email,
      roles: userProperties.roles
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: userProperties.id,
        username: userProperties.username,
        email: userProperties.email,
        roles: userProperties.roles
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

// Esquema para obtener un usuario por ID
const getUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'number' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: userProperties
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
}

// Esquema para obtener todos los usuarios
const getAllUsersSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: userProperties
      }
    }
  }
}

// Esquema para actualizar un usuario
const updateUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'number' }
    }
  },
  body: {
    type: 'object',
    properties: {
      username: userProperties.username,
      email: userProperties.email,
      roles: userProperties.roles
    },
    minProperties: 1
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: userProperties.id,
        username: userProperties.username,
        email: userProperties.email,
        roles: userProperties.roles,
        changes: { type: 'number' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
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

// Esquema para eliminar un usuario
const deleteUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'number' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'number' },
        changes: { type: 'number' }
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
  createUserSchema,
  getUserSchema,
  getAllUsersSchema,
  updateUserSchema,
  deleteUserSchema
}
