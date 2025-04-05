"use strict";

// Schema definitions 
const schemas = {
  // Schema for game configuration options
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
          accelerationEnabled: { type: 'array', items: { type: 'boolean' } }
        }
      }
    }
  },

  // Schema for creating a new game
  createGame: {
    body: {
      type: 'object',
      properties: {
        playerName: { type: 'string', minLength: 1 },
        ballSpeed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
        winningScore: { type: 'integer', minimum: 1, maximum: 20 },
        accelerationEnabled: { type: 'boolean' },
        paddleSize: { type: 'string', enum: ['short', 'medium', 'long'] }
      },
      required: ['playerName']
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

  // Schema for joining a game
  joinGame: {
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
        playerName: { type: 'string', minLength: 1 }
      },
      required: ['playerName']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          gameId: { type: 'string' },
          player: { type: 'integer' },
          gameState: { type: 'object' }
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

  // Schema for spectating a game
  spectateGame: {
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
        spectatorName: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          gameId: { type: 'string' },
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

  // Schema for game actions (start, pause, resume, cancel, reset)
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

  // Schema for getting game state
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

  // Schema for listing games
  listGames: {
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          games: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                gameId: { type: 'string' },
                players: {
                  type: 'object',
                  properties: {
                    player1: { type: ['string', 'null'] },
                    player2: { type: ['string', 'null'] }
                  }
                },
                spectators: { type: 'integer' },
                state: { type: 'string' },
                score: {
                  type: 'object',
                  properties: {
                    player1: { type: 'integer' },
                    player2: { type: 'integer' }
                  }
                },
                settings: {
                  type: 'object',
                  properties: {
                    ballSpeed: { type: 'string' },
                    winningScore: { type: 'integer' },
                    paddleSize: { type: 'string' },
                    accelerationEnabled: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = schemas;