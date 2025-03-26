# ft_transcendence (README temporal)

## Descripción del Proyecto
ft_transcendence es el proyecto final del cursus de 42. Consiste en crear una Single Page Application que incluye un juego multijugador de Pong en tiempo real con funcionalidades sociales y de comunidad.

## Tecnologías Utilizadas

### Backend
- **Framework**: Fastify con Node.js
- **Base de datos**: SQLite
- **Comunicación en tiempo real**: WebSockets para juego multijugador y chat
- **Autenticación**: OAuth 2.0 con Google Sign-in y JWT
- **Seguridad**: Implementación de HTTPS, protección contra inyecciones SQL/XSS, 2FA

### Frontend
- **Lenguaje**: TypeScript
- **Estilado**: Tailwind CSS
- **Renderizado**: React con componentes funcionales

### DevOps
- **Contenedorización**: Docker
- **Microservicios**: Arquitectura basada en componentes modulares

## Funcionalidades Principales

### Juego de Pong
- **Juego clásico**: Implementación fiel al Pong original de 1972
- **Multijugador**: Juego en tiempo real entre dos o más jugadores
- **Emparejamiento**: Sistema de matchmaking para torneos
- **IA**: Oponente controlado por inteligencia artificial
- **Personalización**: Opciones para modificar la velocidad, tamaño de paletas, etc.

### Sistema de Usuarios
- **Perfiles**: Creación y gestión de cuentas con estadísticas y avatares
- **Autenticación**: Login seguro con Google OAuth y autenticación de dos factores
- **Amigos**: Sistema para añadir amigos y ver su estado en línea
- **Historial**: Registro de partidas jugadas con resultados y detalles

### Características Sociales
- **Chat en vivo**: Mensajería directa entre usuarios
- **Bloqueo**: Posibilidad de bloquear usuarios no deseados
- **Invitaciones**: Sistema para invitar a otros usuarios a jugar
- **Notificaciones**: Alertas sobre partidas y eventos del sistema

## Instalación y Ejecución

1. Clona el repositorio:
```bash
git clone https://github.com/usuario/ft_transcendence.git
cd ft_transcendence
```

2. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tus credenciales y otras configuraciones
```

3. Inicia la aplicación con Docker:
```bash
make
```

4. Accede a la aplicación en `https://localhost`

## Estructura del Proyecto
```
ft_transcendence/
├── doc/
├── srcs/
│   ├── backend/
│   │   ├── logging/
│   │   ├── metrics/
│   │   ├── gateway/
│   │   └── services/
│   │       └── example/
│   │
│   ├── frontend/
│   │   ├── nginx/
│   │   └── web/
│   │
│   ├── docker-compose.yml
│   └── .env
│
├── Makefile
└── README.md
```

## Módulos Implementados
En este proyecto, hemos implementado los siguientes módulos según los requisitos:

1. **Framework Backend**: Fastify con Node.js
2. **Frontend**: Tailwind CSS con TypeScript
3. **Base de datos**: SQLite para persistencia de datos
4. **Gestión de Usuarios**: Sistema de autenticación con Google OAuth
5. **Juego en Tiempo Real**: Implementación de WebSockets para multijugador
6. **Chat en Vivo**: Sistema de mensajería entre usuarios
7. **Microservicios**: Arquitectura backend modular

## Despliegue
La aplicación está configurada para ejecutarse en contenedores Docker, facilitando su despliegue en cualquier entorno.

## Seguridad
- Todas las contraseñas están hasheadas
- Implementación completa de HTTPS
- Protección contra inyecciones SQL y ataques XSS
- Validación de formularios tanto en cliente como en servidor
- Autenticación de dos factores disponible

## Contribuciones
Proyecto desarrollado por el equipo:
- [Nombre Compañero 1](https://github.com/usuario1)
- [Nombre Compañero 2](https://github.com/usuario2)
- [Nombre Compañero 3](https://github.com/usuario3)
- [Nombre Compañero 4](https://github.com/usuario4)
- [Nombre Compañero 5](https://github.com/usuario5)

## Licencia
Este proyecto es parte del currículum de 42 y está disponible bajo los términos de la licencia MIT.
