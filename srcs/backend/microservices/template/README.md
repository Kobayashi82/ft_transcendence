# Microservice Template

Este es un template para microservicios basado en Node.js con Fastify, SQLite, Redis, Logstash y métricas para Prometheus.

## Características

- Servidor HTTP con Fastify
- Base de datos SQLite local
- Caché con Redis
- Centralización de logs con Logstash
- Métricas para Prometheus
- Hot-reload para desarrollo
- Dockerfiles para desarrollo y producción

## Estructura del proyecto

```
template/
├── src/
│   ├── app.js                  # Aplicación principal
│   ├── config/                 # Configuración
│   │   └── index.js            # Configuración centralizada
│   ├── plugins/                # Plugins de Fastify
│   │   ├── db.js               # Plugin para SQLite
│   │   ├── redis.js            # Plugin para Redis
│   │   ├── logger.js           # Plugin para logstash
│   │   └── metrics.js          # Plugin para Prometheus
│   ├── routes/                 # Rutas de la API
│   │   ├── index.js            # Carga todas las rutas
│   │   └── hello.js            # Ejemplo de ruta
│   └── services/               # Lógica de negocio
│       └── example.js          # Ejemplo de servicio
├── Dockerfile.dev              # Dockerfile para desarrollo
├── Dockerfile.prod             # Dockerfile para producción
├── package.json                # Dependencias y scripts
├── package-lock.json           # Lock de dependencias
├── nodemon.json                # Configuración para hot-reload
└── README.md                   # Documentación
```

## Uso

### Desarrollo

Para ejecutar el microservicio en modo de desarrollo con hot-reload:

```bash
# Usando Docker
docker-compose up template

# Sin Docker
npm install
npm run dev
```

### Producción

Para construir la imagen de producción:

```bash
docker build -f Dockerfile.prod -t template:prod .
```

## Endpoints

- `GET /`: Información básica del servicio
- `GET /hello?name=nombre`: Ejemplo de ruta con uso de base de datos y caché
- `GET /examples`: Obtiene todos los ejemplos guardados
- `GET /metrics`: Métricas para Prometheus

## Configuración

La configuración se puede modificar a través de variables de entorno:

- `HOST`: Host donde se ejecutará el servidor (default: '0.0.0.0')
- `PORT`: Puerto donde se ejecutará el servidor (default: 3000)
- `LOG_LEVEL`: Nivel de log (default: 'info')
- `DB_PATH`: Ruta a la base de datos SQLite (default: './data/database.sqlite')
- `REDIS_HOST`: Host de Redis (default: 'redis')
- `REDIS_PORT`: Puerto de Redis (default: 6379)
- `LOGSTASH_HOST`: Host de Logstash (default: 'logstash')
- `LOGSTASH_PORT`: Puerto de Logstash (default: 5044)
- `APP_NAME`: Nombre de la aplicación para logs (default: 'template')
- `METRICS_ENDPOINT`: Endpoint para métricas de Prometheus (default: '/metrics')