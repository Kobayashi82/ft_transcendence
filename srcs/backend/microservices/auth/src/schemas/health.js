'use strict'

const healthSchema = {
  schema: {
    description: 'Endpoint to check the status of the service and its dependencies',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          service: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Service name' },
              status: { 
                type: 'string', 
                enum: ['healthy', 'degraded', 'unhealthy'],
                description: 'Overall service status'
              },
              uptime: { type: 'number', description: 'Time in seconds since service start' },
              timestamp: { type: 'string', format: 'date-time', description: 'Check timestamp' },
              version: { type: 'string', description: 'Service version' }
            }
          },
          dependencies: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['healthy', 'degraded', 'down'],
                    description: 'Database connection status'
                  },
                  responseTime: { 
                    type: 'string', 
                    description: 'Database response time',
                    example: '5ms'
                  },
                  error: { 
                    type: 'string', 
                    description: 'Error message if any issues exist'
                  }
                }
              },
              redis: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['healthy', 'degraded', 'down'],
                    description: 'Redis connection status'
                  },
                  responseTime: { 
                    type: 'string', 
                    description: 'Redis response time',
                    example: '2ms'
                  },
                  error: { 
                    type: 'string', 
                    description: 'Error message if any issues exist'
                  }
                }
              },
              jwt: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['healthy', 'degraded', 'down'],
                    description: 'JWT system status'
                  },
                  error: { 
                    type: 'string', 
                    description: 'Error message if any issues exist'
                  }
                }
              },
              security: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['healthy', 'degraded', 'down'],
                    description: 'Security components status'
                  },
                  encryption: { 
                    type: 'string', 
                    description: 'Encryption system status'
                  },
                  circuitBreakers: { 
                    type: 'object',
                    description: 'Circuit breakers status',
                    properties: {
                      googleOAuth: { type: 'string' },
                      fortytwoOAuth: { type: 'string' }
                    }
                  },
                  error: { 
                    type: 'string', 
                    description: 'Error message if any issues exist'
                  }
                }
              }
            }
          }
        }
      },
      503: {
        type: 'object',
        description: 'Service degraded or unhealthy',
        properties: {
          service: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['degraded', 'unhealthy'] },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string' }
            }
          },
          dependencies: {
            type: 'object',
            properties: {
              database: { type: 'object' },
              redis: { type: 'object' },
              jwt: { type: 'object' },
              security: { type: 'object' }
            }
          }
        }
      }
    }
  }
}

module.exports = healthSchema
