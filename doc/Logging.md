# Logging

## Overview

Our microservices architecture implements a centralized logging system that:

1. Provides consistent logging across all services
2. Forwards microservice logs to the Gateway service
3. Integrates with the ELK stack (ElasticSearch, Logstash, Kibana)
4. Buffers logs when the Gateway is unavailable
5. Supports structured logging with metadata

## Gateway Logger

The Gateway service acts as a centralized logging hub

## Microservice Logger

Individual microservices forward their logs to the Gateway

## The ELK Stack: ElasticSearch, Logstash, and Kibana

Our logging system can integrate with the ELK stack, a powerful set of tools for collecting, storing, and visualizing logs:

### ElasticSearch

ElasticSearch is a distributed, RESTful search and analytics engine capable of storing and searching massive volumes of log data. It provides:

- Full-text search with complex query capabilities
- Real-time analytics
- Horizontal scalability
- Schema-free JSON documents

### Logstash

Logstash is a server-side data processing pipeline that ingests data from multiple sources, transforms it, and sends it to ElasticSearch. It handles:

- Collecting logs from various sources
- Parsing and normalizing different log formats
- Enriching logs with additional information
- Filtering and transforming data

In our implementation:
- Gateway connects directly to Logstash via TCP on port 5044
- Logs are sent in JSON format with appropriate metadata
- Connection is resilient with automatic reconnection

### Kibana

Kibana is a visualization layer that works on top of ElasticSearch, providing:

- Powerful dashboards for log visualization
- Real-time monitoring
- Alerts based on log patterns
- Custom visualizations and reports

## Usage Examples

### Basic Logging

```javascript
// Simple informational log
fastify.logger.info('User logged in successfully', { userId: '123', ip: '192.168.1.1' });

// Error logging with stack trace
try {
  // Some operation that might fail
} catch (err) {
  fastify.logger.error('Failed to process something', { 
    error: err.message, 
    stack: err.stack,
    orderId: order.id
  });
}

// Warning log
fastify.logger.warn('Rate limit approaching', { 
  userId: user.id, 
  currentRate: '95/100'
});

// Debug information (only shown when debug level enabled)
fastify.logger.debug('Cache miss', { key: 'user:123' });
```

### Structured Logging with Context

```javascript
// Log with request context
fastify.get('/api/user/:id', async (request, reply) => {
  const { id } = request.params;
  
  fastify.logger.info('User profile requested', {
    userId: id,
    requestId: request.id,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  });
  
  // Process request...
});

// Log performance
async function fetchUserData(userId) {
  const startTime = Date.now();
  
  try {
    const result = await db.users.findById(userId);
    
    const duration = Date.now() - startTime;
    fastify.logger.info('Database query completed', {
      operation: 'fetchUserData',
      userId,
      duration,
      slow: duration > 100 // Flag slow queries
    });
    
    return result;
  } catch (err) {
    fastify.logger.error('Database query failed', {
      operation: 'fetchUserData',
      userId,
      duration: Date.now() - startTime,
      error: err.message
    });
    throw err;
  }
}
```

## Log Levels

Our logging system uses standard log levels in order of severity:

| Level | Description | When to Use |
|-------|-------------|------------|
| `error` | Critical errors that prevent operation | Application crashes, failed connections, data loss |
| `warn` | Warning conditions that should be addressed | Deprecated API usage, resource constraints, retry attempts |
| `info` | Normal operational messages | Service startup/shutdown, user actions, state changes |
| `debug` | Detailed information for debugging | Function entry/exit, values of variables, cache operations |
| `trace` | Very detailed debugging information | Request/response bodies, raw SQL queries |

Configure the appropriate level in your service configuration (config/index.js):

```javascript
  // Log level
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
```

## Best Practices

1. **Be Consistent**: Use the same logging pattern across all services for better analysis.

2. **Structure Logs**: Always include relevant context in metadata objects, not in message strings.

3. **Use Appropriate Log Levels**: Don't log everything as "info" or "error".

4. **Include Request IDs**: Add a unique identifier to trace requests across services.

5. **Don't Log Sensitive Data**: Avoid logging passwords, tokens, or personal information.

6. **Be Selective**: Log important events, not every function call.

7. **Include Timing Information**: For performance-sensitive operations.

## Troubleshooting

If logs aren't appearing as expected:

1. **Check Console Output**: All logs should at least appear in the service's console.

2. **Verify Gateway Connection**: Ensure microservices can reach the gateway.

3. **Check Log Levels**: Make sure the log level is set appropriately.

4. **Inspect Log Buffer**: If the gateway was down, logs may be buffered.

5. **Verify ELK Configuration**: If using ELK, check Logstash, ElasticSearch and Kibana connections.
