# Gateway

Gateway es el responsable de enrutar solicitudes del cliente a los microservicios correspondientes.

## Características

- Reverse proxy para microservicios
- Monitoreo con Prometheus y logs centralizados
- Caché con Redis
- Rate limiting
- Seguridad y autenticación centralizada
- Health checks

## Estructura del proyecto

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

## Métricas y monitoreo

El gateway expone métricas en formato Prometheus en el endpoint `/metrics`.
Algunas de las métricas disponibles:

- `gateway_http_requests_total`				- Total de solicitudes HTTP
- `gateway_http_request_duration_seconds`	- Duración de las solicitudes HTTP
- `gateway_proxy_requests_total`			- Total de solicitudes proxeadas por servicio
- `gateway_proxy_latency_seconds`			- Latencia de solicitudes proxeadas
- `gateway_proxy_errors_total`				- Total de errores en solicitudes proxeadas
