# ft_transcendence

## Descripción
ft_transcendence es una plataforma web del juego de pong en tiempo real, incluyendo un modo contra IA, sistema de torneos, estadísticas de jugadores y tabla de clasificación.

## Arquitectura
El proyecto está construido con una arquitectura de microservicios, utilizando:
- **Frontend**: Aplicación web desarrollada con React/TypeScript y Tailwind CSS
- **Backend**: Servicios independientes desarrollados con Node.js y Fastify
- **Contenedorización**: Docker para orquestar todos los servicios

### Estructura de servicios
- **Gateway**: API Gateway que centraliza las peticiones a los microservicios
- **Game**: Gestiona la lógica del juego y torneos
- **Stats**: Almacena y gestiona estadísticas de jugadores y partidas
- **DeepPong**: Implementa la inteligencia artificial para el modo contra IA
