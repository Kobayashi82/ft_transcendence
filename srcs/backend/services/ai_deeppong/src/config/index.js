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
    // Intervalo de actualización (ms) - Aumentado para reducir el temblor
    updateInterval: 200,
    
    // Desplazamiento del centro de la paleta para simular imprecisión - Reducido para más estabilidad
    paddleCenterOffset: 0.05,
    
    // Dificultad predeterminada
    defaultDifficulty: 'medium',
    
    // Niveles de dificultad
    difficultyLevels: {
      easy: {
        errorRate: 0.3,
        reactionDelay: 20,     // Reacción aumentada para reducir movimientos erráticos
        predictAccuracy: 0.7,
        stabilityFactor: 0.7  // Aumentado para más estabilidad
      },
      medium: {
        errorRate: 0.15,
        reactionDelay: 15,     // Reacción aumentada para reducir movimientos erráticos
        predictAccuracy: 0.85,
        stabilityFactor: 0.8  // Aumentado para más estabilidad
      },
      hard: {
        errorRate: 0.05,
        reactionDelay: 10,     // Pequeño retraso para movimientos más suaves
        predictAccuracy: 0.95,
        stabilityFactor: 0.9  // Aumentado para más estabilidad
      },
      impossible: {
        errorRate: 0.01,      // Casi nunca comete errores
        reactionDelay: 5,     // Pequeño retraso para movimientos más naturales
        predictAccuracy: 0.99, // Alta precisión
        stabilityFactor: 0.95  // Muy estable (casi sin movimientos erráticos)
      }
    }
  }
};

module.exports = config;
