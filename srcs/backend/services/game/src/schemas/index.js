"use strict";

const schemas = {

  // OPTIONS
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
              ai_opponents: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  },

  // CREATE GAME
  createGame: {
    body: {
      type: 'object',
      properties: {
        players: { 
          type: 'array', 
          items: { type: 'string', minLength: 1 },
          minItems: 2,
          maxItems: 2
        },
        settings: {
          type: 'object',
          properties: {
            ballSpeed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
            winningScore: { type: 'integer', minimum: 1, maximum: 20 },
            accelerationEnabled: { type: 'boolean' },
            paddleSize: { type: 'string', enum: ['short', 'medium', 'long'] }
          },
          required: ['ballSpeed', 'winningScore', 'accelerationEnabled', 'paddleSize']
        }
      },
      required: ['players', 'settings']
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

  // CREATE TOURNAMENT
  createTournament: {
    body: {
      type: 'object',
      properties: {
        players: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 4,
          maxItems: 4
        },
        settings: {
          type: 'object',
          properties: {
            ballSpeed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
            winningScore: { type: 'integer', minimum: 1, maximum: 20 },
            accelerationEnabled: { type: 'boolean' },
            paddleSize: { type: 'string', enum: ['short', 'medium', 'long'] }
          }
        }
      },
      required: ['players', 'settings']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          tournamentId: { type: 'string' },
          firstMatchId: { type: 'string' },
          semifinal2Id: { type: 'string' },
          finalId: { type: 'string' },
          settings: { type: 'object' }
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

  // CANCEL TOURNAMENT
  cancelTournament: {
    params: {
      type: 'object',
      properties: {
        tournamentId: { type: 'string' }
      },
      required: ['tournamentId']
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

  // GAME ACTIONS (start, pause, resume, cancel)
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

  // PADDLE MOVE
  paddleMove: {
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

  // PADDLE POSITION
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
  
  // GAME STATE
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
  }

}

module.exports = schemas;
