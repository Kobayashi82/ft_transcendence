'use strict'

require('dotenv').config()

module.exports = {
  // Server config
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Database config
  database: {
    path: process.env.DB_PATH || './data/database.sqlite'
  },
  
  // Redis config
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  },
  
  // Logstash config
  logstash: {
    host: process.env.LOGSTASH_HOST || 'logstash',
    port: process.env.LOGSTASH_PORT || 5044,
    appName: process.env.APP_NAME || 'template'
  },
  
  // Metrics config
  metrics: {
    endpoint: process.env.METRICS_ENDPOINT || '/metrics'
  }
}