<div align="center">

![Desktop](https://img.shields.io/badge/Desktop-brown?style=for-the-badge)
![React](https://img.shields.io/badge/React-TypeScript-blue?style=for-the-badge)
![Fastify](https://img.shields.io/badge/Fastify-Node.js-orange?style=for-the-badge)

*Real-time Pong web platform with a microservices architecture and AI*

</div>

<div align="center">
  <img src="/ft_transcendence.png">
</div>

# ft_transcendence

[README en Español](README_es.md)

> **Note:** This repository is kept for historical reasons, as it contains all commits since the beginning of transcendence development.

`ft_transcendence` is a real-time Pong web platform, including an AI mode, tournament system, player stats, and leaderboard.

## Architecture

The project is built on a microservices architecture, using:

- `Frontend`: Web app built with React/TypeScript and Tailwind CSS
- `Backend`: Independent services built with Node.js and Fastify
- `Containerization`: Docker to orchestrate all services

### Services structure

- `Gateway`: API Gateway that centralizes requests to microservices
- `Game`: Handles game logic and tournaments
- `Stats`: Stores and manages player and match statistics
- `DeepPong`: Implements AI for the vs-AI mode

## Implemented Modules

### Core Modules

- Use of a framework to build the backend (Fastify with Node.js)
- Backend design as microservices
- Introduction of an AI opponent
- Replacement of basic Pong with server-side Pong

### Secondary Modules

- Use of a database for the backend (SQLite)
- Support on all devices
- Expanded browser compatibility
- Game customization options
- User and match statistics dashboards
- Multi-language support

---

## 📄 License

This project is licensed under the WTFPL – [Do What the Fuck You Want to Public License](http://www.wtfpl.net/about/).

---

<div align="center">

**🏓 Developed as part of the 42 School curriculum 🏓**

*"It works, it compiles, it passes... what else do you want?"*

<div align="center">
  <img src="/ft_transcendence.jpg">
</div>
