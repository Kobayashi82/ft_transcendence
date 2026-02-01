<div align="center">

![Desktop](https://img.shields.io/badge/Desktop-brown?style=for-the-badge)
![React](https://img.shields.io/badge/React-TypeScript-blue?style=for-the-badge)
![Fastify](https://img.shields.io/badge/Fastify-Node.js-orange?style=for-the-badge)

*Plataforma web de Pong en tiempo real con arquitectura de microservicios e IA*

</div>

<div align="center">
  <img src="/ft_transcendence.jpg">
</div>

# ft_transcendence

> **Nota:** Este repositorio se mantiene por razones históricas, ya que contiene todos los commits desde el inicio del desarrollo de transcendence.

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

## Módulos Implementados

### Módulos Principales

- Uso de un framework para construir el backend (Fastify con Node.js)
- Diseño del backend como microservicios
- Introducción de un oponente con IA
- Reemplazo del Pong básico con Pong del lado del servidor

### Módulos Secundarios

- Uso de una base de datos para el backend (SQLite)
- Soporte en todos los dispositivos
- Ampliación de la compatibilidad con navegadores
- Opciones de personalización del juego
- Paneles de estadísticas de usuarios y partidas
- Soporte para múltiples idiomas

---

## 📄 Licencia

Este proyecto está licenciado bajo la WTFPL – [Do What the Fuck You Want to Public License](http://www.wtfpl.net/about/).

---

<div align="center">

**🎮 Desarrollado como parte del curriculum de 42 School 🎮**

*"It works, it compiles, it passes... what else do you want?"*
