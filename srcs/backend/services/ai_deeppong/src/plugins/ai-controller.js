"use strict";

const axios = require('axios');
const config = require('../config');
const fp = require('fastify-plugin');
const dns = require('dns');

class AIController {
  constructor() {
    // Cambiando el mapa para usar combinación de gameId y playerNumber como clave
    this.activeGames = new Map(); // Map of active games: `${gameId}_${playerNumber}` -> {playerNumber, intervalId, gameState, difficulty}
    this.gameServiceUrl = config.services.game.url;
    console.log(`AI Controller initialized with game service URL: ${this.gameServiceUrl}`);
  }

  async joinGame(gameId, playerNumber, aiName, difficulty = config.ai.defaultDifficulty) {
    console.log(`AI ${aiName} joining game ${gameId} as player ${playerNumber}`);
    console.log(`Parameters received: gameId=${gameId}, playerNumber=${playerNumber}, aiName=${aiName}, difficulty=${difficulty}`);
    console.log(`Game service URL: ${this.gameServiceUrl}`);
    
    try {
      // Creamos una clave única que combina gameId y playerNumber
      const gameKey = `${gameId}_${playerNumber}`;
      
      // Check if already in this game with this player number
      if (this.activeGames.has(gameKey)) {
        console.log(`AI is already playing in game ${gameId} as player ${playerNumber}, ignoring request`);
        return true;
      }
      
      // Check if difficulty is valid
      console.log(`Available difficulty levels: ${Object.keys(config.ai.difficultyLevels).join(', ')}`);
      const validDifficulty = difficulty in config.ai.difficultyLevels ? 
        difficulty : config.ai.defaultDifficulty;
      console.log(`Using difficulty: ${validDifficulty}`);
      
      // Setup game data
      const gameData = {
        gameId, // Añadimos explícitamente el gameId
        playerNumber,
        aiName,
        difficulty: validDifficulty,
        lastDirection: null,
        gameState: null,
        intervalId: null,
        moveIntervalId: null,
        lastMoveTime: null,
        continuousMovementDuration: 0, 
        lastGameState: null 
      };
      
      console.log(`Setting up game data: ${JSON.stringify(gameData)}`);
      this.activeGames.set(gameKey, gameData);
      
      // Start update loop
      console.log(`Starting game loop for game ${gameId} player ${playerNumber}`);
      this.startGameLoop(gameKey);
      
      console.log(`Successfully joined game ${gameId} as player ${playerNumber}`);
      return true;
    } catch (error) {
      console.error(`Error setting up AI game: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }
  
  async getGameState(gameId) {
    try {
      console.log(`Getting game state for ${gameId} from ${this.gameServiceUrl}/${gameId}`);
      
      const response = await axios.get(`${this.gameServiceUrl}/${gameId}`, {
        timeout: 2000
      });
      
      console.log(`Response from game service for ${gameId}: status=${response.status}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`Game state received successfully for ${gameId}`);
        return response.data.gameState;
      }
      console.warn(`Invalid response for game ${gameId}: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error) {
      console.error(`Error getting game state for ${gameId}: ${error.message}`);
      return null;
    }
  }
  
  startGameLoop(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData) return;
    
    const { gameId, playerNumber } = gameData;
    
    // Limpiar intervalos previos
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    
    console.log(`Starting AI game loop for game ${gameId} player ${playerNumber} with update interval ${config.ai.updateInterval}ms`);
    
    // Inicializar variables de estado
    gameData.lastDirection = null;
    gameData.ballVelocity = null;
    gameData.pendingStopTime = null;
    gameData.previousBall = null;
    gameData.previousTime = null;
    gameData.continuousMovementDuration = 0;
    gameData.lastGameState = null;
    gameData.lastMoveTime = Date.now();
    
    // AJUSTE DE VELOCIDAD ÓPTIMO:
    // La velocidad de la paleta en game-logic.js es constante cuando se mueve, a 5 * dt (dt ≈ 1/60)
    // Esto da aproximadamente 300 unidades por segundo (5 * 60)
    // Este valor se usa SOLO para calcular cuándo enviar un comando "stop"
    gameData.paddleSpeed = 300;
    
    // Ajustar la precisión de la predicción según la dificultad
    switch (gameData.difficulty) {
      case 'easy':
        // Para nivel fácil: menor precisión en la parada y movimientos más lentos
        gameData.paddleSpeed = 270; // Subestimación intencionada
        break;
      case 'medium':
        gameData.paddleSpeed = 290; // Precisión media
        break;
      case 'hard':
        gameData.paddleSpeed = 300; // Bastante preciso
        break;
      case 'impossible':
        gameData.paddleSpeed = 305; // Casi perfecto
        break;
      default:
        gameData.paddleSpeed = 290; // Valor predeterminado
    }
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // INTERVALO: Obtener estado y tomar decisiones - EXACTAMENTE config.ai.updateInterval (1000ms)
    gameData.intervalId = setInterval(async () => {
      try {
        const gameState = await this.getGameState(gameId);
        
        if (!gameState) {
          failureCount++;
          if (failureCount >= MAX_FAILURES) {
            this.endGame(gameKey);
          }
          return;
        }
        
        failureCount = 0;
        
        // Si el juego terminó, limpiar recursos
        if (gameState.gameState === 'finished' || gameState.gameState === 'cancelled') {
          this.endGame(gameKey);
          return;
        }
        
        // NUEVO: Detectar cambio de estado del juego
        if (gameData.lastGameState && gameData.lastGameState !== gameState.gameState) {
          console.log(`AI ${gameId}: Game state changed from ${gameData.lastGameState} to ${gameState.gameState}`);
          
          // Si cambiamos a un estado que no es "playing", detener cualquier movimiento
          if (gameState.gameState !== 'playing' && gameData.lastDirection !== 'stop') {
            console.log(`AI ${gameId}: Game is not playing anymore, stopping paddle`);
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
          }
        }
        
        // Actualizar estado del juego
        gameData.gameState = gameState;
        gameData.lastGameState = gameState.gameState;
        
        // Si no estamos jugando, no hacer nada más
        if (gameState.gameState !== 'playing') {
          return;
        }
        
        const now = Date.now();
        
        // NUEVO: Si llevamos demasiado tiempo en movimiento continuo, forzar una detención
        if (gameData.lastDirection !== 'stop' && gameData.lastDirection !== null) {
          gameData.continuousMovementDuration += (now - gameData.lastMoveTime);
          
          // Si hemos estado moviéndonos en la misma dirección por más de 3 segundos, forzar una parada
          if (gameData.continuousMovementDuration > 3000) {
            console.log(`AI ${gameId}: Forced stop after ${Math.round(gameData.continuousMovementDuration)}ms of continuous movement`);
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
            
            // Esperar un breve momento antes de decidir la próxima acción
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          // Reiniciar contador si estamos detenidos
          gameData.continuousMovementDuration = 0;
        }
        
        gameData.lastMoveTime = now;
        
        // Actualizar velocidad de la bola si tenemos datos anteriores
        if (gameData.previousBall && gameData.previousTime && gameState.ball) {
          const timeDelta = (now - gameData.previousTime) / 1000;  // en segundos
          
          if (timeDelta > 0) {
            const ballXDiff = gameState.ball.x - gameData.previousBall.x;
            const ballYDiff = gameState.ball.y - gameData.previousBall.y;
            
            const ballVelX = ballXDiff / timeDelta;
            const ballVelY = ballYDiff / timeDelta;
            
            // Actualizar velocidad de la bola
            gameData.ballVelocity = {
              x: ballVelX,
              y: ballVelY
            };
          }
        }
        
        // Guardar estado actual para la próxima iteración
        if (gameState.ball) {
          gameData.previousBall = { 
            x: gameState.ball.x, 
            y: gameState.ball.y 
          };
          gameData.previousTime = now;
        }
        
        // Manejar movimiento en cada actualización
        this.handleMovement(gameKey);
        
      } catch (error) {
        console.error(`Error in game loop ${gameId} player ${playerNumber}: ${error.message}`);
        failureCount++;
        
        if (failureCount >= MAX_FAILURES) {
          this.endGame(gameKey);
        }
      }
    }, config.ai.updateInterval); // Usar EXACTAMENTE config.ai.updateInterval
    
    // Timer de seguridad: comprobar cada 200ms si es necesario detener la paleta
    gameData.moveIntervalId = setInterval(async () => {
      try {
        // NUEVO: No hacer nada si el juego no está en estado "playing"
        if (!gameData.gameState || gameData.gameState.gameState !== 'playing') return;
        
        const now = Date.now();
        
        if (gameData.pendingStopTime) {
          if (now >= gameData.pendingStopTime) {
            console.log(`AI ${gameId}: Executing STOP command at ${now}`);
            await this.sendMove(gameId, gameData.playerNumber, 'stop');
            gameData.lastDirection = 'stop';
            gameData.pendingStopTime = null;
            gameData.continuousMovementDuration = 0;
          }
        }
        
        // Verificar si ha pasado demasiado tiempo desde el último comando (para evitar bloqueos)
        if (gameData.lastMoveTime && gameData.lastDirection !== 'stop' && 
            (now - gameData.lastMoveTime > 2500)) { // Reducido de 5000ms a 2500ms
          console.log(`AI ${gameId}: No movement detected for ${Math.round((now - gameData.lastMoveTime)/1000)}s, sending STOP as failsafe`);
          await this.sendMove(gameId, gameData.playerNumber, 'stop');
          gameData.lastDirection = 'stop';
          gameData.pendingStopTime = null;
          gameData.continuousMovementDuration = 0;
        }
      } catch (error) {
        console.error(`Error in stop-timer loop ${gameId}: ${error.message}`);
      }
    }, 200);  // Verificar cada 200ms (suficientemente rápido para reaccionar, pero no demasiado exigente)
  }
  
  handleMovement(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData || !gameData.gameState) return;
    
    const { gameId, gameState, playerNumber, difficulty } = gameData;
    
    // Verificar explícitamente que el juego está en estado "playing"
    if (gameState.gameState !== 'playing') return;
    
    // Verificar que tenemos los datos necesarios
    if (!gameState.ball) return;
    
    const now = Date.now();
    gameData.lastMoveTime = now; // Actualizar timestamp del último movimiento procesado
    
    // Obtener la posición actual de la paleta
    const myPlayer = playerNumber === 1 ? gameState.player1 : gameState.player2;
    if (!myPlayer) return;
    
    const paddleY = myPlayer.y;
    const paddleHeight = gameState.config.paddleHeight;
    const paddleCenter = paddleY + paddleHeight / 2;
    
    // Calcular la posición objetivo
    const targetPosition = this.calculateTargetPosition(gameKey);
    if (targetPosition === null) return;
    
    // Distancia al objetivo
    const distanceToTarget = targetPosition - paddleCenter;
    
    // MODIFICADO: Umbral basado en dificultad - Aumentado significativamente para mayor estabilidad
    let threshold;
    switch (difficulty) {
      case 'impossible': threshold = 25; break; // Aumentado de 10 a 25
      case 'hard': threshold = 35; break; // Aumentado de 20 a 35
      case 'medium': threshold = 45; break; // Aumentado de 30 a 45
      case 'easy': threshold = 55; break; // Aumentado de 40 a 55
      default: threshold = 40; // Aumentado de 25 a 40
    }
    
    // NUEVO: Si la paleta ya estaba detenida y la distancia sigue siendo pequeña
    // mantenemos la paleta quieta incluso con un umbral mayor para evitar movimientos innecesarios
    if (gameData.lastDirection === 'stop') {
      // Umbral mucho más amplio cuando ya estamos parados para evitar reiniciar movimiento por pequeños cambios
      threshold *= 1.5; // 100% más de margen cuando ya estamos detenidos (antes era 1.5 o 50%)
    }
    
    // NUEVO: Implementar amortiguación para evitar cambios rápidos de dirección
    // Si no tenemos una última dirección registrada, inicializarla
    if (!gameData.directionHistory) {
      gameData.directionHistory = [];
      gameData.lastDirectionChangeTime = 0;
      gameData.stablePositionCount = 0;
    }
    
    // NUEVO: Tiempo mínimo para mantener una dirección (en ms)
    const minDirectionTime = 100; // Mínimo 300ms en la misma dirección
    
    // NUEVO: Verificar si ha pasado suficiente tiempo desde el último cambio de dirección
    const timeSinceLastDirectionChange = now - gameData.lastDirectionChangeTime;
    const canChangeDirection = timeSinceLastDirectionChange > minDirectionTime;
    
    // Si ya estamos suficientemente cerca del objetivo, quedarnos quietos
    if (Math.abs(distanceToTarget) <= threshold) {
      if (gameData.lastDirection !== 'stop') {
        console.log(`AI ${gameId}: Already at target position (distance=${Math.round(distanceToTarget)}px, threshold=${threshold}px), stopping`);
        this.sendMove(gameId, playerNumber, 'stop');
        gameData.lastDirection = 'stop';
        gameData.pendingStopTime = null;
        gameData.continuousMovementDuration = 0;
        gameData.stablePositionCount = 0; // Resetear contador de posición estable
      } else {
        // NUEVO: Incrementar contador de "estabilidad" si seguimos en la misma posición
        gameData.stablePositionCount++;
        
        // Si llevamos varias iteraciones en posición estable, aumentar el umbral aún más
        // para aumentar la "inercia" y evitar movimientos por pequeñas variaciones
        if (gameData.stablePositionCount > 3) {
          threshold *= 1.5; // 50% adicional después de 3 iteraciones estables
        }
      }
      return;
    }
    
    // Determinar dirección basada en la distancia al objetivo
    const direction = distanceToTarget > 0 ? 'down' : 'up';
    
    // NUEVO: Guardar historial de direcciones (limitar a las últimas 5)
    gameData.directionHistory.unshift(direction);
    if (gameData.directionHistory.length > 5) {
      gameData.directionHistory.pop();
    }
    
    // NUEVO: Detectar oscilaciones rápidas y prevenirlas
    if (gameData.directionHistory.length >= 3) {
      const pattern = gameData.directionHistory.slice(0, 3).join('');
      // Detectar patrones oscilatorios como "updownup" o "downupdown"
      if (pattern === 'updownup' || pattern === 'downupdown') {
        this.sendMove(gameId, playerNumber, 'stop');
        gameData.lastDirection = 'stop';
        gameData.pendingStopTime = null;
        gameData.directionHistory = [];
        gameData.lastDirectionChangeTime = now;
        gameData.continuousMovementDuration = 0;
        gameData.stablePositionCount = 0;
        return;
      }
    }
    
    // NUEVO: Si no podemos cambiar de dirección todavía, mantener la dirección actual
    if (!canChangeDirection && gameData.lastDirection !== 'stop' && gameData.lastDirection !== direction) {
      console.log(`AI ${gameId}: Direction change too soon (${gameData.lastDirection} to ${direction}), maintaining current direction`);
      return;
    }
    
    // Si ya tenemos programada una parada pero la dirección ha cambiado y podemos cambiar
    if (gameData.pendingStopTime !== null) {
      if (gameData.lastDirection !== direction && canChangeDirection) {
        // La dirección cambió, cancelar la parada programada
        console.log(`AI ${gameId}: Direction changed from ${gameData.lastDirection} to ${direction}, cancelling scheduled stop`);
        gameData.pendingStopTime = null;
        gameData.lastDirectionChangeTime = now; // Registrar momento del cambio
      } else {
        // Verificar que la parada programada aún tiene sentido
        const currentTimeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000;
        const projectedStopTime = now + currentTimeToTarget;
        
        // Si la diferencia es significativa, actualizar el tiempo de parada
        if (Math.abs(projectedStopTime - gameData.pendingStopTime) > 100) {
          gameData.pendingStopTime = projectedStopTime;
        }
        return;
      }
    }
    
    // Si no hay cambio de dirección y estamos en movimiento, actualizar el tiempo de parada
    if (direction === gameData.lastDirection && gameData.lastDirection !== 'stop') {
      const currentTimeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000;
      
      // Limitar el tiempo máximo de movimiento continuo
      const maxMoveTime = 2000; // 2 segundos
      const timeToStop = Math.min(currentTimeToTarget, maxMoveTime);
      
      gameData.pendingStopTime = now + timeToStop;
      return;
    }
    
    // MODIFICADO: Si necesitamos cambiar de dirección, pero la distancia es pequeña
    // mejor detenernos completamente para evitar oscilaciones
    if (gameData.lastDirection !== 'stop' && gameData.lastDirection !== direction && 
        Math.abs(distanceToTarget) < threshold * 2) {
      console.log(`AI ${gameId}: Small direction change needed, stopping first to avoid oscillation`);
      this.sendMove(gameId, playerNumber, 'stop');
      gameData.lastDirection = 'stop';
      gameData.pendingStopTime = null;
      gameData.lastDirectionChangeTime = now;
      gameData.stablePositionCount = 0;
      
      // Esperar antes de tomar la próxima decisión
      return;
    }
    
    // Aplicar factor de corrección según dificultad para evitar paradas demasiado tempranas
    let correctionFactor;
    switch (difficulty) {
      case 'impossible': correctionFactor = 1.0; break;
      case 'hard': correctionFactor = 0.98; break;
      case 'medium': correctionFactor = 0.95; break;
      case 'easy': correctionFactor = 0.9; break;
      default: correctionFactor = 0.95;
    }
    
    const timeToTarget = Math.abs(distanceToTarget) / gameData.paddleSpeed * 1000 * correctionFactor;
    
    // MODIFICADO: Programar una parada si la distancia es pequeña o el tiempo al objetivo es corto
    let stopTime;
    if (Math.abs(distanceToTarget) < threshold * 3) {
      // Para distancias pequeñas, movimientos más cortos y controlados
      stopTime = now + Math.min(timeToTarget, 100); // Máximo 100ms para ajustes finos
      console.log(`AI ${gameId}: Fine adjustment ${direction}, will stop in ${Math.round(stopTime - now)}ms`);
    } else if (timeToTarget > config.ai.updateInterval * 2) {
      // Para distancias grandes, limitar el tiempo de movimiento
      stopTime = now + Math.min(2000, config.ai.updateInterval * 2);
      console.log(`AI ${gameId}: Moving ${direction}, target far (${Math.round(timeToTarget)}ms), limiting movement time`);
    } else {
      // Programar la detención para el momento exacto
      stopTime = now + timeToTarget;
      console.log(`AI ${gameId}: Moving ${direction}, will stop in ${Math.round(stopTime - now)}ms`);
    }
    
    // Enviar el comando de movimiento
    this.sendMove(gameId, playerNumber, direction);
    gameData.lastDirection = direction;
    gameData.pendingStopTime = stopTime;
    gameData.lastDirectionChangeTime = now;
    gameData.stablePositionCount = 0;
    
    // Resetear contador de movimiento continuo al cambiar de dirección
    gameData.continuousMovementDuration = 0;
  }
  
  calculateTargetPosition(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData || !gameData.gameState) return null;
    
    const { gameId, gameState, playerNumber, difficulty } = gameData;
    const ball = gameState.ball;
    const config = gameState.config;
    
    if (!ball || !config) return null;
    
    // Obtener dimensiones
    const gameWidth = config.width;
    const gameHeight = config.height;
    
    // Si no tenemos datos de velocidad todavía, mantener la paleta quieta en el centro
    if (!gameData.ballVelocity) {
      return gameHeight / 2; // Posición central
    }
    
    // Determinar si la bola viene hacia nosotros
    const ballVelX = gameData.ballVelocity.x;
    const isComingTowardsUs = (playerNumber === 1 && ballVelX < 0) ||
                             (playerNumber === 2 && ballVelX > 0);
    
    // MODIFICADO: Si la bola no viene hacia nosotros, mantener la posición actual
    // para evitar completamente los movimientos erráticos
    if (!isComingTowardsUs) {
      // Obtener la posición actual de la paleta
      const myPlayer = playerNumber === 1 ? gameState.player1 : gameState.player2;
      if (!myPlayer) return gameHeight / 2;
      
      const paddleY = myPlayer.y;
      const paddleHeight = gameState.config.paddleHeight;
      const paddleCenter = paddleY + paddleHeight / 2;
      
      // IMPORTANTE: Devolver la posición ACTUAL de la paleta para que no se mueva
      return paddleCenter;
    }
    
    // A partir de aquí es el código original para cuando la bola viene hacia nosotros
    // Calcular la posición X de nuestra paleta
    const paddleX = playerNumber === 1 ? config.paddleWidth : gameWidth - config.paddleWidth;
    
    // Tiempo hasta el impacto - cálculo más preciso
    const distX = Math.abs(paddleX - ball.x);
    const timeToImpact = Math.abs(distX / ballVelX);
    
    // Ajuste de precisión de predicción según dificultad
    let predictionAccuracy;
    switch (difficulty) {
      case 'impossible': predictionAccuracy = 1.0; break; // Predicción perfecta
      case 'hard': predictionAccuracy = 0.99; break; // Muy preciso
      case 'medium': predictionAccuracy = 0.96; break; // Bastante preciso
      case 'easy': predictionAccuracy = 0.92; break; // Predicción menos precisa
      default: predictionAccuracy = 0.96;
    }
    
    // Velocidad Y corregida para la predicción
    const correctedVelY = gameData.ballVelocity.y * predictionAccuracy;
    
    // ALGORITMO MEJORADO DE PREDICCIÓN CON MÚLTIPLES REBOTES
    let predictedY = ball.y;
    let remainingTime = timeToImpact;
    let currentVelY = correctedVelY;
    let maxBounces = 10; // Limitar número de rebotes para evitar bucles infinitos
    let bounceCount = 0;
    
    // Simular el movimiento de la pelota con rebotes hasta el tiempo de impacto
    while (remainingTime > 0 && bounceCount < maxBounces) {
      // Calcular tiempo hasta el siguiente rebote (si lo hay)
      let timeToTopBound = currentVelY < 0 ? -predictedY / currentVelY : Infinity;
      let timeToBottomBound = currentVelY > 0 ? (gameHeight - predictedY) / currentVelY : Infinity;
      let timeToNextBounce = Math.min(timeToTopBound, timeToBottomBound);
      
      // Si no hay rebote antes del impacto, calcular posición final
      if (timeToNextBounce >= remainingTime) {
        predictedY += currentVelY * remainingTime;
        break;
      }
      
      // Ajuste de precisión en los rebotes - simular pequeñas pérdidas de energía
      // Más pronunciado en dificultades más bajas
      let energyLoss = 0;
      switch (difficulty) {
        case 'impossible': energyLoss = 0; break; // Sin pérdida
        case 'hard': energyLoss = 0.002; break; // Mínima pérdida
        case 'medium': energyLoss = 0.005; break; // Pérdida moderada
        case 'easy': energyLoss = 0.01; break; // Mayor pérdida
        default: energyLoss = 0.005;
      }
      
      // Actualizar posición hasta el rebote con mayor precisión
      predictedY += currentVelY * timeToNextBounce;
      
      // Invertir velocidad Y (rebote) con pequeña pérdida de energía para mayor realismo
      currentVelY = -currentVelY * (1 - energyLoss);
      
      // Corregir posición exactamente en los bordes para evitar errores
      if (Math.abs(predictedY) < 0.001) predictedY = 0.001;
      if (Math.abs(predictedY - gameHeight) < 0.001) predictedY = gameHeight - 0.001;
      
      // Reducir tiempo restante
      remainingTime -= timeToNextBounce;
      bounceCount++;
    }
    
    // Aplicar pequeñas variaciones aleatorias según dificultad
    // para simular comportamiento humano
    if (difficulty !== 'impossible') {
      const randomRange = {
        'easy': 25,
        'medium': 12,
        'hard': 6
      }[difficulty] || 0;
      
      if (randomRange > 0) {
        // Generar una desviación que sigue una distribución más natural
        // Más probable estar cerca del centro de la distribución
        const randomOffset = (Math.random() + Math.random() - 1) * randomRange;
        predictedY += randomOffset;
      }
    }
    
    // Garantizar que permanezca dentro de los límites
    const paddleHeight = config.paddleHeight;
    const paddleHalfHeight = paddleHeight / 2;
    
    // Ajustar para que el centro de la paleta esté en la posición calculada
    predictedY = Math.max(paddleHalfHeight, Math.min(gameHeight - paddleHalfHeight, predictedY));
    
    // Guardar esta posición como la última calculada
    gameData.lastTargetPosition = predictedY;
    
    return predictedY;
  }
  
  async sendMove(gameId, playerNumber, direction) {
    try {
      console.log(`Sending move for game ${gameId}: player=${playerNumber}, direction=${direction}`);
      
      if (!direction) {
        console.log(`Invalid move direction for game ${gameId}: ${direction}`);
        return false;
      }
      
      // Validate the URL before making the request
      if (!this.gameServiceUrl) {
        console.error(`Game service URL is not configured`);
        return false;
      }
      
      const moveUrl = `${this.gameServiceUrl}/${gameId}/move`;
      console.log(`Making POST request to: ${moveUrl}`);
      
      const moveData = {
        player: playerNumber,
        direction
      };
      console.log(`Move data: ${JSON.stringify(moveData)}`);
      
      const response = await axios.post(moveUrl, moveData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000
      });
      
      console.log(`Move response for game ${gameId}: status=${response.status}, data=${JSON.stringify(response.data)}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`Successfully sent move ${direction} for player ${playerNumber} in game ${gameId}`);
        return true;
      } else {
        console.warn(`Failed to send move: server returned status ${response.status}, success=${response.data.success}`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending move for game ${gameId}: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`No response received from server`);
      }
      console.error(`Stack trace: ${error.stack}`);
      return false;
    }
  }
  
  endGame(gameKey) {
    const gameData = this.activeGames.get(gameKey);
    if (!gameData) return;
    
    const { gameId, playerNumber } = gameData;
    
    // Limpiar intervalos
    if (gameData.intervalId) clearInterval(gameData.intervalId);
    if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    
    // Asegurarse de detener cualquier movimiento
    if (gameData.lastDirection !== 'stop') {
      this.sendMove(gameId, playerNumber, 'stop').catch(err => {
        console.error(`Error stopping paddle on game end: ${err.message}`);
      });
    }
    
    this.activeGames.delete(gameKey);
    console.log(`Game ${gameId} player ${playerNumber} ended and resources released`);
  }
  
  getActiveGames() {
    const games = [];
    this.activeGames.forEach((data, gameKey) => {
      games.push({
        gameId: data.gameId,
        playerNumber: data.playerNumber,
        aiName: data.aiName,
        difficulty: data.difficulty,
        isActive: !!data.intervalId
      });
    });
    return games;
  }
}

const aiController = new AIController();

async function aiControllerPlugin(fastify, options) {
  fastify.decorate('ai', aiController);
  
  fastify.addHook('onClose', (instance, done) => {
    aiController.activeGames.forEach((gameData, gameKey) => {
      if (gameData.intervalId) clearInterval(gameData.intervalId);
      if (gameData.moveIntervalId) clearInterval(gameData.moveIntervalId);
    });
    done();
  });
}

module.exports = fp(aiControllerPlugin);
module.exports.aiController = aiController;
