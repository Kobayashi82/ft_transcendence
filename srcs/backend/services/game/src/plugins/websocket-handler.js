"use strict";

const fp = require('fastify-plugin');
const gameManager = require('./game-manager');
const { v4: uuidv4 } = require('uuid');

function websocketHandler(fastify, options, done) {

  fastify.get('/game/ws/pong', { websocket: true }, (connection, req) => {
    const ws = connection.socket;
    const clientId = uuidv4();
    
    console.log(`WebSocket connection established: ${clientId}`);
    console.log(`Connection details: ${req.headers['origin']}`);
    ws.send(JSON.stringify({ type: 'welcome', message: 'Conexión establecida' }));
           
    // DISCONNECT
    ws.on('close', () => {
      console.log(`WebSocket connection closed: ${clientId}`);
      gameManager.unregisterClient(clientId);
    });

    // ERROR
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });

    // ERROR
    function sendError(ws, message) {
      ws.send(JSON.stringify({ type: 'error', message }));
    }

    // MESSAGES
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (!data.type) return sendError(ws, 'Missing message type');
        switch (data.type) {
          case 'start':
            handleStart(data, clientId, ws);
            break;
          case 'move':
            handleMove(data, clientId, ws);
            break;
          case 'position':
            handlePosition(data, clientId, ws);
            break;
          case 'pause':
            handlePause(data, clientId, ws);
            break;
          case 'resume':
            handleResume(data, clientId, ws);
            break;
          case 'cancelled':
            handleCancel(data, clientId, ws);
            break;
          case 'state':
            handleState(data, clientId, ws);
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            sendError(ws, `Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        sendError(ws, 'Invalid message format');
      }
    });


    // START
    function handleStart(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in start message');
      
      const success = gameManager.startGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'started',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else sendError(ws, 'Unable to start game');
    }

    // PAUSE
    function handlePause(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in pause message');
      
      const success = gameManager.pauseGame(data.gameId);
      if (success) {
        ws.send(JSON.stringify({
          type: 'paused',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else sendError(ws, 'Unable to pause game');
    }
    
    // RESUME
    function handleResume(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in resume message');
      
      const success = gameManager.resumeGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'resumed',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else sendError(ws, 'Unable to resume game');
    }

    // CANCEL
    function handleCancel(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in resume message');
      
      const success = gameManager.cancelGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'cancelled',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else sendError(ws, `Unable to cancel game: ${data.gameId}`);
    }

    // PADDLE MOVE
    function handleMove(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || !data.direction) {
        return sendError(ws, 'Missing parameters in move message. Required: gameId, player, direction');
      }
      
      // Convert 'stop' to null for the game logic
      const movementDirection = data.direction === 'stop' ? null : data.direction;
      const success = gameManager.handlePaddleMove(data.gameId, data.player, movementDirection);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }
    
    // PADDLE POSITION
    function handlePosition(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || data.y === undefined) {
        return sendError(ws, 'Missing parameters in position message. Required: gameId, player, y');
      }
      
      const success = gameManager.setPaddlePosition(data.gameId, data.player, data.y);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }

    // STATE
    function handleState(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in state message');
      }
      
      // Register this client with the game manager so it receives updates
      gameManager.registerClient(data.gameId, clientId, ws);
      
      const gameState = gameManager.getGameState(data.gameId);     
      if (gameState) {
        ws.send(JSON.stringify({
          type: 'state',
          gameId: data.gameId,
          data: gameState
        }));
      } else sendError(ws, `Game not found: ${data.gameId}`);
    }

  });
  
  done();
}

module.exports = fp(websocketHandler, {
  name: 'websocket-handler'
});