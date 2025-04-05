"use strict";

const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');
const gameManager = require('./game-manager');

function websocketHandler(fastify, options, done) {
  fastify.get('/ws/pong', { websocket: true }, (connection, req) => {
    // Generate a unique client ID
    const clientId = uuidv4();
    let playerInfo = null;
    
    console.log(`WebSocket connection established: ${clientId}`);
    
    // Handle incoming messages
    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(data, clientId, connection.socket);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        sendError(connection.socket, 'Invalid message format');
      }
    });
    
    // Handle disconnect
    connection.socket.on('close', () => {
      console.log(`WebSocket connection closed: ${clientId}`);
      gameManager.unregisterClient(clientId);
    });
    
    // Message handler
    function handleMessage(data, clientId, ws) {
      if (!data.type) {
        return sendError(ws, 'Missing message type');
      }
      
      switch (data.type) {
        case 'join':
          handleJoin(data, clientId, ws);
          break;
        case 'create':
          handleCreate(data, clientId, ws);
          break;
        case 'start':
          handleStart(data, clientId, ws);
          break;
        case 'move':
          handleMove(data, clientId, ws);
          break;
        case 'position':
          handlePosition(data, clientId, ws);
          break;
        case 'spectate':
          handleSpectate(data, clientId, ws);
          break;
        case 'pause':
          handlePause(data, clientId, ws);
          break;
        case 'resume':
          handleResume(data, clientId, ws);
          break;
        case 'reset':
          handleReset(data, clientId, ws);
          break;
        default:
          sendError(ws, `Unknown message type: ${data.type}`);
      }
    }
    
    // Join a game
    function handleJoin(data, clientId, ws) {
      if (!data.gameId || !data.playerName) {
        return sendError(ws, 'Missing gameId or playerName in join message');
      }
      
      // Validate player name is not in use
      if (gameManager.isPlayerInGame(data.playerName)) {
        const playerInfo = gameManager.players.get(data.playerName);
        
        // If player is trying to rejoin their game, allow it
        if (playerInfo && playerInfo.gameId === data.gameId) {
          const success = gameManager.registerClient(data.gameId, clientId, ws, data.playerName);
          
          if (success) {
            const gameState = gameManager.getGameState(data.gameId);
            ws.send(JSON.stringify({
              type: 'joined',
              playerNumber: playerInfo.playerNumber,
              gameId: data.gameId,
              gameState
            }));
          } else {
            sendError(ws, `Game not found: ${data.gameId}`);
          }
          
          return;
        }
        
        // Otherwise, reject
        return sendError(ws, `Player "${data.playerName}" is already in another game`);
      }
      
      // Get game state
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        return sendError(ws, `Game not found: ${data.gameId}`);
      }
      
      // Determine player number (1 or 2)
      let playerNumber = null;
      if (!game.player1) {
        playerNumber = 1;
      } else if (!game.player2) {
        playerNumber = 2;
      } else {
        return sendError(ws, 'Game is already full');
      }
      
      // Add player to game
      gameManager.addPlayer(data.gameId, data.playerName, playerNumber);
      
      // Register client
      const success = gameManager.registerClient(data.gameId, clientId, ws, data.playerName);
      
      if (success) {
        const gameState = gameManager.getGameState(data.gameId);
        ws.send(JSON.stringify({
          type: 'joined',
          playerNumber,
          gameId: data.gameId,
          gameState
        }));
      }
    }
    
    // Create a new game
    function handleCreate(data, clientId, ws) {
      if (!data.playerName) {
        return sendError(ws, 'Missing playerName in create message');
      }
      
      // Check if player already in a game
      if (gameManager.isPlayerInGame(data.playerName)) {
        return sendError(ws, `Player "${data.playerName}" is already in a game`);
      }
      
      // Extract game options
      const options = {
        ballSpeed: data.ballSpeed || 'medium',
        winningScore: data.winningScore || 5,
        accelerationEnabled: data.accelerationEnabled || false,
        paddleSize: data.paddleSize || 'medium'
      };
      
      // Create a new game
      const gameId = gameManager.createGame(options);
      
      // Add player 1
      gameManager.addPlayer(gameId, data.playerName, 1);
      
      // Register the client with the new game
      gameManager.registerClient(gameId, clientId, ws, data.playerName);
      
      // Send confirmation
      ws.send(JSON.stringify({
        type: 'created',
        gameId,
        playerNumber: 1,
        options,
        gameState: gameManager.getGameState(gameId)
      }));
    }
    
    // Start a game
    function handleStart(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in start message');
      }
      
      // Check if game exists
      if (!gameManager.getGame(data.gameId)) {
        return sendError(ws, `Game not found: ${data.gameId}`);
      }
      
      // Check if game has enough players
      if (!gameManager.hasEnoughPlayers(data.gameId)) {
        return sendError(ws, 'Not enough players to start the game');
      }
      
      const success = gameManager.startGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'started',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else {
        sendError(ws, 'Unable to start game');
      }
    }
    
    // Handle player movement
    function handleMove(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || !data.direction) {
        return sendError(ws, 'Missing parameters in move message. Required: gameId, player, direction');
      }
      
      // Convert 'stop' to null for the game logic
      const movementDirection = data.direction === 'stop' ? null : data.direction;
      
      const success = gameManager.handlePlayerMovement(data.gameId, data.player, movementDirection);
      
      if (!success) {
        sendError(ws, `Game not found: ${data.gameId}`);
      }
    }
    
    // Set paddle position directly
    function handlePosition(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || data.y === undefined) {
        return sendError(ws, 'Missing parameters in position message. Required: gameId, player, y');
      }
      
      const success = gameManager.setPaddlePosition(data.gameId, data.player, data.y);
      
      if (!success) {
        sendError(ws, `Game not found: ${data.gameId}`);
      }
    }
    
    // Spectate a game
    function handleSpectate(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in spectate message');
      }
      
      const spectatorName = data.spectatorName || 'Anonymous';
      
      // Add spectator to game
      const success = gameManager.addSpectator(data.gameId, spectatorName);
      
      if (success) {
        // Register client as spectator
        gameManager.registerClient(data.gameId, clientId, ws, spectatorName, true);
        
        ws.send(JSON.stringify({
          type: 'spectating',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else {
        sendError(ws, `Game not found: ${data.gameId}`);
      }
    }
    
    // Pause a game
    function handlePause(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in pause message');
      }
      
      const success = gameManager.pauseGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'paused',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else {
        sendError(ws, 'Unable to pause game');
      }
    }
    
    // Resume a game
    function handleResume(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in resume message');
      }
      
      const success = gameManager.resumeGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'resumed',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else {
        sendError(ws, 'Unable to resume game');
      }
    }
    
    // Reset a game
    function handleReset(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in reset message');
      }
      
      const success = gameManager.resetGame(data.gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'reset',
          gameId: data.gameId,
          gameState: gameManager.getGameState(data.gameId)
        }));
      } else {
        sendError(ws, 'Unable to reset game');
      }
    }
    
    // Send error message to client
    function sendError(ws, message) {
      ws.send(JSON.stringify({
        type: 'error',
        message
      }));
    }
  });
  
  done();
}

module.exports = fp(websocketHandler, {
  name: 'websocket-handler'
});