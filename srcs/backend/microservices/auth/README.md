# User

Responsable de...

## Características

- Monitoreo con Prometheus y logs centralizados
- Caché con Redis
- Health checks

## Estructura

```
user/
├── src/									- Código fuente
│   ├── app.js								- Aplicación principal
│   ├── config/								- Configuración
│   │   ├── index.js						- Configuración centralizada
│   │   └── services.js						- Definición de microservicios
│   ├── plugins/							- Plugins Fastify
│   │   ├── auth.js							- Plugin de autenticación
│   │   ├── logger.js						- Plugin de logging
│   │   ├── metrics.js						- Plugin para Prometheus
│   │   ├── db.js							- Plugin para SQLite
│   │   ├── error-handler.js				- Plugin para errores
│   │   └── redis.js						- Plugin para Redis
│   ├── schemes/							- Define Schemes
│   │   └── users.js						- Scheme para users
│   ├── routes/								- Definición de rutas
│   │   ├── auth.js							- Rutas de auth
│   │   ├── health.js						- Rutas de health
│   │   ├── users.js						- Rutas de users
│   │   └── index.js						- Punto de entrada de rutas
│   └── schemas/							- Definición de schemas
│       ├── auth.js							- Schemas de auth
│       └── users.js						- Schemas de users
├── nodemon.json							- Comando para hot-reload
├── Dockerfile.dev							- Docker para desarrollo
├── Dockerfile.prod							- Docker para producción
└── package.json							- Dependencias y scripts
```

## Endpoints

- `GET /`									- Información básica del gateway
- `GET /health`								- Health check del gateway y servicios
- `GET /metrics`							- Métricas de Prometheus

## Métricas

Métricas en formato Prometheus en el endpoint `/metrics`.

- `user_http_requests_total`				- Total de solicitudes HTTP
- `user_http_request_duration_seconds`		- Duración de las solicitudes HTTP
- `user_db_operations_total`				- 
- `user_db_operation_duration_seconds`		- 
- `user_external_calls_total`				- 
- `user_external_call_duration_seconds`	- 
- `user_business_operations_total`			- 




  const testing = async (level, message, meta = {}) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    try { 

      console.log("\nBEGIN TESTS\n")  

      // Example of Logger
      {
        fastify.logger_local.info("This log is displayed in the local console")
        fastify.logger_local.warn("This log is displayed in the local console")
        fastify.logger_local.error("This log is displayed in the local console")  

        console.log("") // This is displayed in the local console too 

        fastify.logger.info("This log is displayed in the local console, the gateway console, and sent to Logstash")
        fastify.logger.warn("This log is displayed in the local console, the gateway console, and sent to Logstash")
        fastify.logger.error("This log is displayed in the local console, the gateway console, and sent to Logstash")
      } 

      console.log("\n") 

      // Example of Redis usage
      {
        if (fastify.cache.isRedisAvailable())
          fastify.logger.info('Redis available')
        else
          fastify.logger_local.warn('Redis not available. Using local memory')

        let value = null; 

        // Store a value in cache (expires in 5 seconds)
        await fastify.cache.set('key', {
          message: 'Hello from cache',
          other_data: 1234,
          timestamp: new Date().toISOString() 
        }, 5)

        // Wait 6 seconds and the key must be removed from cache
        // It may seem like it has not been added to the cache
        // await sleep(6000);

        if (await fastify.cache.exists('key')) {
          value = await fastify.cache.get('key')
          fastify.logger_local.info('Value from cache: ', value)
          await fastify.cache.del('key')
          fastify.logger_local.info('Value remove from cache')
          if (await fastify.cache.exists('key'))
            fastify.logger_local.error('Value still exists in cache')
          else
            fastify.logger_local.info('Value no longer exists in cache')
        } else {
          fastify.logger_local.error('Value has not been added to cache')
        }     
      } 

      console.log("\nEND TESTS\n")
    } catch (error) {
      fastify.logger_local.error('An error occurred')
    } 
  }
  
  fastify.get('/test', async (request, reply) => {
    await testing()

    return { message: 'testing' }
  })
