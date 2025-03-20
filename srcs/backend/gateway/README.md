# API Gateway - ft_transcendence

API Gateway para el proyecto ft_transcendence, responsable de enrutar solicitudes del cliente a los microservicios correspondientes.

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
├── src/                       # Código fuente
│   ├── app.js                 # Aplicación principal
│   ├── config/                # Configuración
│   │   ├── index.js           # Configuración centralizada
│   │   └── services.js        # Definición de microservicios
│   ├── plugins/               # Plugins Fastify
│   │   ├── auth.js            # Plugin de autenticación
│   │   ├── logger.js          # Plugin de logging
│   │   ├── metrics.js         # Plugin para Prometheus
│   │   ├── proxy.js           # Plugin para proxy a microservicios
│   │   └── redis.js           # Plugin para Redis
│   └── routes/                # Definición de rutas
│       ├── api.js             # API y endpoints del gateway
│       ├── health.js          # Rutas de health check
│       └── index.js           # Punto de entrada de rutas
├── Dockerfile.dev             # Docker para desarrollo
├── Dockerfile.prod            # Docker para producción
└── package.json               # Dependencias y scripts
```

## Requisitos

- Node.js 20 o superior
- Redis (para caché y rate limiting)
- Docker y Docker Compose (recomendado)

## Configuración

1. Copia el archivo `.env.example` a `.env` y ajusta los valores según tu entorno:

```bash
cp .env.example .env
```

## Desarrollo

Para ejecutar el gateway en modo desarrollo con hot-reload:

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

Con Docker:

```bash
docker build -t gateway-dev -f Dockerfile.dev .
docker run -p 3000:3000 --env-file .env gateway-dev
```

## Producción

Para construir y ejecutar en modo producción:

```bash
docker build -t gateway-prod -f Dockerfile.prod .
docker run -p 3000:3000 --env-file .env gateway-prod
```

## API Gateway Endpoints

- `GET /` - Información básica del gateway
- `GET /health` - Health check del gateway y servicios
- `GET /health/services` - Health check detallado de los servicios
- `GET /health/redis` - Health check de Redis
- `GET /metrics` - Métricas de Prometheus
- `GET /services` - Listado de servicios disponibles

## Agregar un nuevo microservicio

Para agregar un nuevo microservicio al gateway:

1. Actualiza el archivo `src/config/services.js`:

```javascript
// Definición de los microservicios disponibles
const services = {
  // Servicios existentes...
  
  // Agregar nuevo servicio
  nuevoServicio: {
    url: process.env.NUEVO_SERVICIO_URL || 'http://nuevo-servicio:3000',
    prefix: '/nuevo-servicio',
    timeout: parseInt(process.env.NUEVO_SERVICIO_TIMEOUT || '5000'),
  }
};
```

2. Agrega la variable de entorno en `.env`:

```
NUEVO_SERVICIO_URL=http://nuevo-servicio:3000
NUEVO_SERVICIO_TIMEOUT=5000
```

El gateway automáticamente enrutará las peticiones con el prefijo adecuado al nuevo servicio.

## Métricas y monitoreo

El gateway expone métricas en formato Prometheus en el endpoint `/metrics`. Algunas de las métricas disponibles:

- `gateway_http_requests_total` - Total de solicitudes HTTP
- `gateway_http_request_duration_seconds` - Duración de las solicitudes HTTP
- `gateway_proxy_requests_total` - Total de solicitudes proxeadas por servicio
- `gateway_proxy_latency_seconds` - Latencia de solicitudes proxeadas
- `gateway_proxy_errors_total` - Total de errores en solicitudes proxeadas