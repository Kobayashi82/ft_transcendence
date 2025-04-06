"use strict";

// Schema definitions 
const schemas = {
  // Schema for options
  gameOptions: {
    response: {
      200: {
        type: 'object',
        properties: {
          ballSpeed: { type: 'array', items: { type: 'string' } },
          paddleSize: { type: 'array', items: { type: 'string' } },
          winningScore: {
            type: 'object',
            properties: {
              min: { type: 'integer' },
              max: { type: 'integer' }
            }
          },
          accelerationEnabled: { type: 'array', items: { type: 'boolean' } },
          default: { 
            type: 'object',
            properties: {
              ballSpeed: { type: 'string' },
              winningScore: { type: 'integer' },
              accelerationEnabled: { type: 'boolean' },
              paddleSize: { type: 'string' },
              ai_opponents: { type: 'array', items: { type: 'string' } },
            }
          }
        }
      }
    }
  },

  // Schema for new game
  createGame: {
    body: {
      type: 'object',
      properties: {
        player1Name: { type: 'string', minLength: 1 },
        player2Name: { type: 'string', minLength: 1 },
        ballSpeed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
        winningScore: { type: 'integer', minimum: 1, maximum: 20 },
        accelerationEnabled: { type: 'boolean' },
        paddleSize: { type: 'string', enum: ['short', 'medium', 'long'] }
      },
      required: ['player1Name', 'player2Name']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          gameId: { type: 'string' },
          options: {
            type: 'object',
            properties: {
              ballSpeed: { type: 'string' },
              winningScore: { type: 'integer' },
              accelerationEnabled: { type: 'boolean' },
              paddleSize: { type: 'string' }
            }
          }
        }
      },
      409: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Schema for game actions (start, pause, resume, cancel)
  gameAction: {
    params: {
      type: 'object',
      properties: {
        gameId: { type: 'string' }
      },
      required: ['gameId']
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
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      404: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Schema for game state
  getGame: {
    params: {
      type: 'object',
      properties: {
        gameId: { type: 'string' }
      },
      required: ['gameId']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          gameState: { type: 'object' }
        }
      },
      404: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Schema for player movement
  playerMove: {
    params: {
      type: 'object',
      properties: {
        gameId: { type: 'string' }
      },
      required: ['gameId']
    },
    body: {
      type: 'object',
      properties: {
        player: { type: 'integer', enum: [1, 2] },
        direction: { type: 'string', enum: ['up', 'down', 'stop'] }
      },
      required: ['player', 'direction']
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
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Schema for paddle position
  paddlePosition: {
    params: {
      type: 'object',
      properties: {
        gameId: { type: 'string' }
      },
      required: ['gameId']
    },
    body: {
      type: 'object',
      properties: {
        player: { type: 'integer', enum: [1, 2] },
        y: { type: 'number', minimum: 0 }
      },
      required: ['player', 'y']
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
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  },
};

module.exports = schemas;
