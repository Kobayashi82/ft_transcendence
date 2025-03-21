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
│   │   └── index.js						- Configuración centralizada
│   ├── plugins/							- Plugins Fastify
│   │   ├── auth.js							- Plugin de autenticación
│   │   ├── logstash.js						- Plugin de logging
│   │   ├── metrics.js						- Plugin para Prometheus
│   │   ├── db.js							- Plugin para SQLite
│   │   └── redis.js						- Plugin para Redis
│   ├── schemes/							- Define Schemes
│   │   └── users.js						- Scheme para users
│   └── routes/								- Definición de rutas
│       ├── health.js						- Rutas de health
│       ├── users.js						- Rutas de users
│       └── index.js						- Punto de entrada de rutas
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
