# Gateway

Responsable de enrutar solicitudes del cliente a los microservicios correspondientes.

## Características

- Reverse proxy para microservicios
- Monitoreo con Prometheus y logs centralizados
- Caché con Redis
- Rate limiting
- Seguridad y autenticación centralizada
- Health checks

## Estructura

```
gateway/
├── src/									- Código fuente
│   ├── app.js								- Aplicación principal
│   ├── config/								- Configuración
│   │   ├── index.js						- Configuración centralizada
│   │   └── services.js						- Definición de microservicios
│   ├── plugins/							- Plugins Fastify
│   │   ├── auth.js							- Plugin de autenticación
│   │   ├── logstash.js						- Plugin de logging
│   │   ├── metrics.js						- Plugin para Prometheus
│   │   ├── proxy.js						- Plugin para proxy a microservicios
│   │   └── redis.js						- Plugin para Redis
│   └── routes/								- Definición de rutas
│       ├── api.js							- Endpoints del gateway
│       ├── health.js						- Rutas de health check
│       └── index.js						- Punto de entrada de rutas
├── nodemon.json							- Comando para hot-reload
├── Dockerfile.dev							- Docker para desarrollo
├── Dockerfile.prod							- Docker para producción
└── package.json							- Dependencias y scripts
```

## Endpoints

- `GET /`									- Información básica del gateway
- `GET /health`								- Health check del gateway y servicios
- `GET /health/services`					- Health check detallado de los servicios
- `GET /health/redis`						- Health check de Redis
- `GET /metrics`							- Métricas de Prometheus
- `GET /services`							- Listado de servicios disponibles

## Métricas

Métricas en formato Prometheus en el endpoint `/metrics`.

- `gateway_http_requests_total`				- Total de solicitudes HTTP
- `gateway_http_request_duration_seconds`	- Duración de las solicitudes HTTP
- `gateway_proxy_requests_total`			- Total de solicitudes proxeadas por servicio
- `gateway_proxy_latency_seconds`			- Latencia de solicitudes proxeadas
- `gateway_proxy_errors_total`				- Total de errores en solicitudes proxeadas

### Gateway

### Authentication
- [✗] JWT (JSON Web Token) validation
- [✗] Role-based access control (RBAC)						Gateway checks if the user's role permits access to the requested resource/endpoint

### Input Validation
- [✓] Query parameter validation
- [✗] Path parameter validation
- [✗] Data type validation
- [✗] Data sanitization										validator.js Apply sanitization in a preValidation hook before schema validation. Create sanitization specific to your data types (emails, usernames, etc.)
- [✓] Content-Type validation								API endpoints only accept data in expected formats (application/json, etc.) Automatically when you configure routes to expect specific content types

### HTTP Headers
- [✓] Content Security Policy (CSP)
- [✓] X-Content-Type-Options
- [✓] X-Frame-Options
- [✓] Referrer-Policy
- [✓] Cache-Control
- [✓] HTTP Strict Transport Security (HSTS)
- [✓] CORS (Cross-Origin Resource Sharing)

### API Security
- [✗] API key validation
- [✗] Request signing for sensitive operations
- [✗] Request timeouts										Configure timeouts in Fastify (request.socket.setTimeout())
- [✗] Response size limits									Add middleware to check response size before sending
- [✗] Proper HTTP status codes
- [✓] Rate limiting

### Logging & Monitoring
- [✓] Security event logging
- [✓] Sensitive operation logging							Log entries with operation type, user, and affected resources
- [✗] Log rotation and retention policies
- [✗] Real-time security alerts
- [✓] Log format standardization
- [✗] Request tracing with unique identifiers
- [✗] Secure logging (no sensitive data in logs)

### Data Protection
- [✗] Prevention of sensitive data exposure
- [✗] Secure error handling
- [✗] Request/response payload size limits					For your project: Configure Fastify's body parser limits
