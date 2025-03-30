# Template

Responsable de...

## Características

- Metricas
- Redis
- Health checks

## Estructura

```
template/
├── src/
│   ├── config/
│   │   ├── index.js						- Configuración centralizada
│   │   └── services.js						- Definición de microservicios
│   │
│   ├── plugins/
│   │   ├── logger.js						- Plugin de logging
│   │   ├── metrics.js						- Plugin para Prometheus
│   │   ├── db.js							- Plugin para SQLite
│   │   └── error-handler.js				- Plugin para errores
│   │
│   ├── routes/
│   │   ├── health.js						- Rutas de health
│   │   └── index.js						- Punto de entrada de rutas
│   │
│   ├── schemas/
│   │   └── template.js						- Schemas de users
│   │
│   └── app.js								- Aplicación principal
│
├── Dockerfile.dev							- Docker para desarrollo
├── Dockerfile.prod							- Docker para producción
└── package.json							- Dependencias y scripts
```

## Endpoints

- `GET /health` - Health check
- `GET /metrics` - Métricas de Prometheus

## Métricas

Métricas en formato Prometheus en el endpoint `/metrics`.

- `user_db_operations_total` -
- `user_db_operation_duration_seconds` -
