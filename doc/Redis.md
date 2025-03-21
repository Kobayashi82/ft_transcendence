# Redis Integration Guide

## What is Redis?

Redis (Remote Dictionary Server) is an open-source, in-memory data structure store that can be used as a database, cache, message broker, and streaming engine.

## Why Use Redis in Our Microservices Architecture?

Our architecture leverages Redis for several key purposes:

1. **Caching**: Reduce database load and improve response times by storing frequently accessed data
2. **Session Management**: Store user session information with automatic expiration
3. **Rate Limiting**: Control API access rates to prevent abuse
4. **Pub/Sub Messaging**: Enable real-time communication between microservices
5. **Distributed Locks**: Coordinate access to shared resources across services

## Redis Plugin

Our `redis.js` plugin provides a standardized way to connect to Redis across all microservices:

## Usage Examples

### Basic Cache Operations

```javascript
// Store a value with default TTL (1 hour)
await fastify.cache.set('user:profile:123', { 
  name: 'John Doe', 
  email: 'john@example.com' 
});

// Retrieve a cached value
const userProfile = await fastify.cache.get('user:profile:123');
console.log(userProfile.name); // John Doe

// Check if a key exists
const exists = await fastify.cache.exists('user:profile:123');
console.log(exists); // 1 if exists, 0 if not

// Delete a key
await fastify.cache.del('user:profile:123');
```

### Using Custom TTL Values

```javascript
// Short-lived cache for volatile data (30 seconds)
await fastify.cache.set('stock:price:AAPL', 175.34, 30);

// Medium-term cache for semi-static data (1 hour)
await fastify.cache.set('product:details:456', productData, 3600);

// Long-term cache for static data (1 day)
await fastify.cache.set('app:config', configData, 86400);

// Store permanently (no expiration)
await fastify.cache.set('system:constants', constants, 0);
```

### Common Use Cases

**User Session Management**:
```javascript
// Store session with 30 minute expiry
await fastify.cache.set(`session:${sessionId}`, sessionData, 1800);
```

**API Response Caching**:
```javascript
// Function with cache layer
async function getProductData(productId) {
  const cacheKey = `product:${productId}`;
  
  // Try to get from cache first
  const cachedData = await fastify.cache.get(cacheKey);
  if (cachedData) return cachedData;
  
  // Otherwise fetch from database
  const productData = await db.products.findById(productId);
  
  // Cache for 5 minutes
  await fastify.cache.set(cacheKey, productData, 300);
  
  return productData;
}
```

## TTL Guidelines

Time To Live (TTL) values should be carefully chosen based on the nature of the data:

| Use Case | Recommended TTL | Rationale |
|----------|----------------|-----------|
| Session cache | 15-30 minutes | Balance between security and user experience |
| External API responses | 1-5 minutes | Updates frequently but reduces external API load |
| Static content | 1-24 hours | Content that changes daily (e.g., HTML/CSS/JS) |
| Rate limiting | 60 seconds | Short windows for request control |
| JWT/OAuth2 tokens | 5-15 minutes | Security for ephemeral tokens |
| Database query results | 30 seconds | Data requiring high freshness (e.g., real-time stock) |
| Counters/metrics | 1-7 days | Cumulative metrics (e.g., daily visits) |

## Best Practices

1. **Follow the 80/20 Rule**: If 80% of your reads can use slightly stale data, use appropriate TTL values.

2. **Use Consistent Key Patterns**: Follow patterns like `entity:id:attribute` for predictable caching.

3. **Don't Cache Everything**: Only cache data that is:
   - Expensive to compute or retrieve
   - Read frequently
   - Updated infrequently
   - Acceptable to be slightly stale

4. **Cache Invalidation**: Delete keys when the underlying data changes to prevent stale data.

5. **Monitor Redis Memory**: Set appropriate `maxmemory` and eviction policies.

6. **Use Serialization Consistently**: Our implementation uses JSON serialization for all values.
