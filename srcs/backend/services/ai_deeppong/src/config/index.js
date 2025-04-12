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
    // Intervalo de actualización (ms)
    updateInterval: 1000,
    
    // Desplazamiento del centro de la paleta para simular imprecisión
    paddleCenterOffset: 0.1,
    
    // Dificultad predeterminada
    defaultDifficulty: 'medium',
    
    // Niveles de dificultad
    difficultyLevels: {
      easy: {
        errorRate: 0.4,       // Probabilidad de cometer un error
        reactionDelay: 500,   // Retraso en la reacción (ms)
        predictAccuracy: 0.6  // Precisión en la predicción de la trayectoria
      },
      medium: {
        errorRate: 0.2,
        reactionDelay: 300,
        predictAccuracy: 0.8
      },
      hard: {
        errorRate: 0.1,
        reactionDelay: 150,
        predictAccuracy: 0.9
      },
      impossible: {
        errorRate: 0.05,
        reactionDelay: 50,
        predictAccuracy: 0.98
      }
    }
  }
};

module.exports = config;
