# ft_transcendence

> **Note:** This repository is maintained for historical reasons, as it contains all commits since the beginning of transcendence development.

ft_transcendence is a real-time Pong game web platform, including an AI mode, tournament system, player statistics, and leaderboard.

## Architecture

The project is built with a microservices architecture, using:

- **Frontend**: Web application developed with React/TypeScript and Tailwind CSS
- **Backend**: Independent services developed with Node.js and Fastify
- **Containerization**: Docker to orchestrate all services

### Service Structure

- **Gateway**: API Gateway that centralizes requests to microservices
- **Game**: Manages game logic and tournaments
- **Stats**: Stores and manages player and match statistics
- **DeepPong**: Implements artificial intelligence for the AI mode

## Implemented Modules

### Major Modules

- Use a framework to build the backend (Fastify with Node.js)
- Designing the backend as microservices
- Introduce an AI opponent
- Replace basic Pong with server-side Pong

### Minor Modules

- Use a database for the backend (SQLite)
- Support on all devices
- Expanding browser compatibility
- Game customization options
- User and Game Stats Dashboards
- Multiple language support

<br>

---
<br>

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
