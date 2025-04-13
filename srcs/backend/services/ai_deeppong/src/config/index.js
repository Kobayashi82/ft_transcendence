"use strict";

require("dotenv").config();

const config = {
  // Server
  serviceName: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[0]) || "ai_deeppong",
  port: (process.env.SERVICE_URL && process.env.SERVICE_URL.split(":")[1]) || 3000,
  host: "0.0.0.0", version: "1.0",

  // Estado del servicio
  status: {
    alive: true,
    version: '1.0.0',
  },
  
  // Configuración de los servicios externos
  services: {
    game: {
      url: process.env.GAME_SERVICE_URL || 'http://game:3000',
    }
  },
  
  // Configuración de la IA
  ai: {
    // Intervalo de actualización (ms) - Volver a 1000ms (1 segundo)
    updateInterval: 1000,
    
    // Desplazamiento del centro de la paleta para simular imprecisión
    paddleCenterOffset: 0.1,
    
    // Dificultad predeterminada
    defaultDifficulty: 'medium',
    
    // Niveles de dificultad
    difficultyLevels: {
      easy: {
        errorRate: 0.3,
        reactionDelay: 1,     // Reacción inmediata (1ms)
        predictAccuracy: 0.7,
        stabilityFactor: 0.4  // Menos estable (más movimientos aleatorios)
      },
      medium: {
        errorRate: 0.15,
        reactionDelay: 1,     // Reacción inmediata (1ms)
        predictAccuracy: 0.85,
        stabilityFactor: 0.6  // Estabilidad media
      },
      hard: {
        errorRate: 0.05,
        reactionDelay: 1,     // Reacción inmediata (1ms)
        predictAccuracy: 0.95,
        stabilityFactor: 0.7  // Buena estabilidad
      },
      impossible: {
        errorRate: 0.01,      // Casi nunca comete errores
        reactionDelay: 1,     // Reacción inmediata (1ms)
        predictAccuracy: 0.99, // Alta precisión
        stabilityFactor: 0.8  // Muy estable (casi sin movimientos erráticos)
      }
    }
  }
};

module.exports = config;
