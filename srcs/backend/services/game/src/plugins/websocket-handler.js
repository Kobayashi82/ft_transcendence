"use strict";

const fp = require('fastify-plugin');
const gameManager = require('./game-manager');
const tournamentManager = require('./tournament-manager');
const { v4: uuidv4 } = require('uuid');

function websocketHandler(fastify, options, done) {

  // Helper function to release players from tournament games
  function releasePlayersFromTournament(tournamentId) {
    console.log(`Releasing players from tournament: ${tournamentId}`);
    
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) {
      console.log(`Tournament ${tournamentId} not found`);
      return false;
    }
    
    // For each match in the tournament, get the game and release players
    for (const matchId of tournament.matches) {
      const match = tournamentManager.matches.get(matchId);
      
      if (match && match.gameId) {
        const game = gameManager.getGame(match.gameId);
        
        // Release players from this game
        if (game) {
          console.log(`Releasing players from match ${matchId}, game ${match.gameId}`);
          
          // Remove players from gameManager's players map
          if (game.player1) {
            console.log(`Releasing player: ${game.player1}`);
            gameManager.players.delete(game.player1);
          }
          
          if (game.player2) {
            console.log(`Releasing player: ${game.player2}`);
            gameManager.players.delete(game.player2);
          }
        }
      }
    }
    
    // Send tournament results to stats service
    sendTournamentResultsToStats(tournamentId);
    
    return true;
  }
  
  // Helper function to send tournament results to stats
  async function sendTournamentResultsToStats(tournamentId) {
    try {
      const tournament = tournamentManager.getTournament(tournamentId);
      if (!tournament) {
        console.log(`Tournament ${tournamentId} not found for stats`);
        return;
      }
      
      // Find the final match to determine the winner
      const finalMatchId = tournament.matches[2]; // The third match is the final
      const finalMatch = tournamentManager.matches.get(finalMatchId);
      
      if (!finalMatch || !finalMatch.gameId) {
        console.log('Final match not found or not played');
        return;
      }
      
      const finalGame = gameManager.getGame(finalMatch.gameId);
      
      if (!finalGame) {
        console.log('Final game not found');
        return;
      }
      
      // Determine winner
      const winner = finalGame.player1Score > finalGame.player2Score ? 
        finalGame.player1 : finalGame.player2;
      
      // Create tournament result payload - match format to what the model expects
      const tournamentPayload = {
        name: `Tournament ${tournamentId.substring(0, 8)}`, // Generating a name based on ID
        start_time: new Date(tournament.createdAt).toISOString(),
        end_time: new Date().toISOString(),
        settings: tournament.settings || {},
        status: 'completed',
        players: tournament.players.map(playerId => ({ user_id: playerId }))
      };
      
      console.log(`Sending tournament results to stats: ${JSON.stringify(tournamentPayload)}`);
      
      const statsService = require('../config').services.stats;
      const axios = require('axios');
      
      // First create the tournament
      const createResponse = await axios.post(`${statsService.url}/tournaments`, tournamentPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: statsService.timeout
      });
      
      const tournamentDbId = createResponse.data.id;
      console.log(`Tournament created in stats with ID: ${tournamentDbId}`);
      
      // Now update the tournament results with winner
      const results = tournament.players.map(playerId => {
        return {
          user_id: playerId,
          position: playerId === winner ? 1 : 2 // Winner is position 1, others are position 2
        };
      });
      
      await axios.put(`${statsService.url}/tournaments/${tournamentDbId}/results`, {
        results: results
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: statsService.timeout
      });
      
      console.log(`Tournament results sent to stats service: ${tournamentId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send tournament results to stats service: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }

  fastify.get('/game/ws/pong', { websocket: true }, (connection, req) => {
    const ws = connection.socket;
    const clientId = uuidv4();
    
    console.log(`WebSocket connection established: ${clientId}`);
    console.log(`Connection details: ${req.headers['origin']}`);
           
    // DISCONNECT
    ws.on('close', () => {
      console.log(`WebSocket connection closed: ${clientId}`);
      // Find game associated with this client and cancel it if not already finished
      const clientEntry = gameManager.getClientInfo(clientId);
      if (clientEntry && clientEntry.gameId) {
        const game = gameManager.getGame(clientEntry.gameId);
        if (game && ['playing', 'paused', 'waiting'].includes(game.gameState)) {
          console.log(`Cancelling game ${clientEntry.gameId} due to websocket disconnect`);
          gameManager.cancelGame(clientEntry.gameId);
        }
      }
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
          case 'cancel':
            handleCancel(data, clientId, ws);
            break;
          case 'state':
            handleState(data, clientId, ws);
            break;
          case 'next':
            handleNext(data, clientId, ws);
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
      
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      const success = gameManager.startGame(gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'started',
          gameId: data.gameId, // Send back original ID
          gameState: gameManager.getGameState(gameId)
        }));
      } else sendError(ws, 'Unable to start game');
    }

    // PAUSE
    function handlePause(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in pause message');
      
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      const success = gameManager.pauseGame(gameId);
      if (success) {
        ws.send(JSON.stringify({
          type: 'paused',
          gameId: data.gameId,
          gameState: gameManager.getGameState(gameId)
        }));
      } else sendError(ws, 'Unable to pause game');
    }
    
    // RESUME
    function handleResume(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in resume message');
      
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      const success = gameManager.resumeGame(gameId);
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'resumed',
          gameId: data.gameId, // Send back original ID
          gameState: gameManager.getGameState(gameId)
        }));
      } else sendError(ws, 'Unable to resume game');
    }

    // CANCEL
    function handleCancel(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in cancel message');
      
      let gameId = data.gameId;
      let tournamentId = null;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails) {
        // Si es una partida de torneo, guardar la ID del torneo
        tournamentId = matchDetails.tournamentId;
        
        if (matchDetails.gameId) {
          // Si es una partida de torneo, usar la ID real del juego
          gameId = matchDetails.gameId;
        }
      }
      
      const success = gameManager.cancelGame(gameId);
      
      // Si es un torneo, también cancelar el torneo completo
      if (success && tournamentId) {
        console.log(`Canceling tournament ${tournamentId} due to match cancellation`);
        releasePlayersFromTournament(tournamentId);
        tournamentManager.cancelTournament(tournamentId);
      }
      
      if (success) {
        ws.send(JSON.stringify({
          type: 'cancelled',
          gameId: data.gameId, // Send back original ID
          gameState: gameManager.getGameState(gameId),
          tournamentCancelled: tournamentId ? true : false
        }));
      } else sendError(ws, `Unable to cancel game: ${data.gameId}`);
    }

    // PADDLE MOVE
    function handleMove(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || !data.direction) {
        return sendError(ws, 'Missing parameters in move message. Required: gameId, player, direction');
      }
      
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      // Convert 'stop' to null for the game logic
      const movementDirection = data.direction === 'stop' ? null : data.direction;
      const success = gameManager.handlePaddleMove(gameId, data.player, movementDirection);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }
    
    // PADDLE POSITION
    function handlePosition(data, clientId, ws) {
      if (!data.gameId || data.player === undefined || data.y === undefined) {
        return sendError(ws, 'Missing parameters in position message. Required: gameId, player, y');
      }
      
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      const success = gameManager.setPaddlePosition(gameId, data.player, data.y);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }

    // STATE
    function handleState(data, clientId, ws) {
      if (!data.gameId) {
        return sendError(ws, 'Missing gameId in state message');
      }
      
      let gameId = data.gameId;
      
      // First, check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) {
        // If it's a tournament match, use the actual game ID
        gameId = matchDetails.gameId;
      }
      
      // Validate game exists
      const gameState = gameManager.getGameState(gameId);
      
      if (gameState) {
        // Register this client with the game manager so it receives updates
        gameManager.registerClient(gameId, clientId, ws, data.playerName, data.isSpectator || false);
        
        ws.send(JSON.stringify({
          type: 'state',
          gameId: data.gameId, // Send back original match/game ID
          data: gameState
        }));
      } else {
        // If game is not found, it might be a tournament match not yet created
        if (matchDetails) {
          sendError(ws, `Tournament match not yet started: ${data.gameId}`);
        } else {
          sendError(ws, `Game not found: ${data.gameId}`);
        }
      }
    }

    // Handle tournament "NEXT" action for progression between rounds
    function handleNext(data, clientId, ws) {
      try {
        if (!data.gameId) {
          return sendError(ws, 'Missing gameId in next message');
        }
        
        console.log(`Processing next message for game ID: ${data.gameId}`);
        
        // First check if the game exists
        let gameId = data.gameId;
        let matchId = data.gameId;
        
        // Check if this is a tournament match ID
        const matchDetails = tournamentManager.matches.get(matchId);
        
        if (!matchDetails) {
          return sendError(ws, `Tournament match not found: ${matchId}`);
        }
        
        if (matchDetails.gameId) {
          gameId = matchDetails.gameId;
        }
        
        console.log(`Match ID: ${matchId}, Game ID: ${gameId}`);
        
        // Check if the game has finished and is in 'next' state
        const gameState = gameManager.getGameState(gameId);
        if (!gameState || gameState.gameState !== 'next') {
          return sendError(ws, `Game is not ready for next round: ${gameId}`);
        }
        
        // Save results to stats service
        gameManager.sendGameResultsToStats(gameId);
        
        // Get tournament data to check match sequence
        const tournamentData = tournamentManager.getTournament(matchDetails.tournamentId);
        if (!tournamentData) {
          return sendError(ws, `Tournament not found: ${matchDetails.tournamentId}`);
        }
        
        console.log(`Tournament data: ${JSON.stringify(tournamentData)}`);
        
        // Find current match index in tournament
        const currentMatchIndex = tournamentData.matches.findIndex(id => id === matchId);
        
        if (currentMatchIndex === -1) {
          return sendError(ws, `Match not found in tournament: ${matchId}`);
        }
        
        console.log(`Current match index: ${currentMatchIndex}, Total matches: ${tournamentData.matches.length}`);
        
        // Find the next match based on tournament flow
        let nextMatchId;
        const isFinalMatch = currentMatchIndex === tournamentData.matches.length - 1;
        const isFirstSemifinal = currentMatchIndex === 0;
        const isSecondSemifinal = currentMatchIndex === 1;
        
        console.log(`Is first semifinal: ${isFirstSemifinal}, Is second semifinal: ${isSecondSemifinal}, Is final: ${isFinalMatch}`);
        
        if (isFirstSemifinal) {
          // After first semifinal, go to second semifinal
          nextMatchId = tournamentData.matches[1]; // Second semifinal
          console.log(`Moving to second semifinal: ${nextMatchId}`);
        } else if (isSecondSemifinal) {
          // After second semifinal, go to final
          nextMatchId = tournamentData.matches[2]; // Final match
          console.log(`Moving to final match: ${nextMatchId}`);
        } else {
          // This was the final match or an unknown state
          console.log(`Tournament completed, no more matches`);
          
          // Get and cleanup all games associated with this tournament
          releasePlayersFromTournament(matchDetails.tournamentId);
          
          ws.send(JSON.stringify({
            type: 'tournament_completed',
            tournamentId: matchDetails.tournamentId,
            message: 'Tournament has completed'
          }));
          return;
        }
        
        // Get the next match details
        const nextMatchDetails = tournamentManager.getMatchDetails(nextMatchId);
        console.log(`Next match details: ${JSON.stringify(nextMatchDetails)}`);
        
        // Check if the next match already has a game ID
        if (nextMatchDetails.gameId) {
          console.log(`Game already exists for next match: ${nextMatchDetails.gameId}`);
          
          // Game already exists, send its state
          const nextGameState = gameManager.getGameState(nextMatchDetails.gameId);
          
          // For semifinal 2, add isSecondSemifinal flag
          if (isFirstSemifinal && nextGameState) {
            nextGameState.settings.isSecondSemifinal = true;
          }
          
          ws.send(JSON.stringify({
            type: 'next_match',
            matchId: nextMatchId,
            gameId: nextMatchDetails.gameId,
            gameState: nextGameState
          }));
          return;
        }
        
        // Need to create game for the next match
        console.log(`Creating new game for next match`);
        
        // Create game with the same settings for the next match
        const currGame = gameManager.getGame(gameId);
        if (!currGame) {
          return sendError(ws, `Current game not found: ${gameId}`);
        }
        
        const nextGameSettings = {
          ballSpeed: currGame.ballSpeed,
          winningScore: currGame.winningScore,
          accelerationEnabled: currGame.accelerationEnabled,
          paddleSize: currGame.paddleSize,
          tournamentMode: true,
          tournamentRound: isSecondSemifinal ? 2 : 1, // Set round to 2 if going to final, otherwise stay at 1
          isSecondSemifinal: isSecondSemifinal // Corrección: Usar el valor real de isSecondSemifinal
        };
        
        console.log(`Next game settings: ${JSON.stringify(nextGameSettings)}`);
        
        let player1, player2;
        
        if (isSecondSemifinal) {
          // Going to final - determine players from semifinal winners
          console.log(`Determining players for final match from semifinal winners`);
          
          const firstSemiMatch = tournamentManager.matches.get(tournamentData.matches[0]);
          const secondSemiMatch = tournamentManager.matches.get(tournamentData.matches[1]);
          
          console.log(`First semifinal: ${JSON.stringify(firstSemiMatch)}`);
          console.log(`Second semifinal: ${JSON.stringify(secondSemiMatch)}`);
          
          if (!firstSemiMatch || !firstSemiMatch.gameId) {
            return sendError(ws, 'Cannot determine players for final match - first semifinal not found');
          }
          
          if (!secondSemiMatch || !secondSemiMatch.gameId) {
            return sendError(ws, 'Cannot determine players for final match - second semifinal not found');
          }
          
          const firstSemiGame = gameManager.getGame(firstSemiMatch.gameId);
          const secondSemiGame = gameManager.getGame(secondSemiMatch.gameId);
          
          console.log(`First semifinal game: ${JSON.stringify(firstSemiGame)}`);
          console.log(`Second semifinal game: ${JSON.stringify(secondSemiGame)}`);
          
          if (!firstSemiGame) {
            return sendError(ws, 'First semifinal game not found');
          }
          
          if (!secondSemiGame) {
            return sendError(ws, 'Second semifinal game not found');
          }
          
          // Determine winners from both semifinals
          console.log(`First semifinal scores: ${firstSemiGame.player1Score} - ${firstSemiGame.player2Score}`);
          console.log(`Second semifinal scores: ${secondSemiGame.player1Score} - ${secondSemiGame.player2Score}`);
          
          const firstSemiWinner = firstSemiGame.player1Score > firstSemiGame.player2Score ? 
            firstSemiGame.player1 : firstSemiGame.player2;
            
          const secondSemiWinner = secondSemiGame.player1Score > secondSemiGame.player2Score ?
            secondSemiGame.player1 : secondSemiGame.player2;
            
          console.log(`First semifinal winner: ${firstSemiWinner}`);
          console.log(`Second semifinal winner: ${secondSemiWinner}`);
          
          player1 = firstSemiWinner;
          player2 = secondSemiWinner;
        } else {
          // Next semifinal - use predefined players
          console.log(`Using predefined players for second semifinal`);
          player1 = nextMatchDetails.player1;
          player2 = nextMatchDetails.player2;
        }
        
        console.log(`Creating game with players: ${player1} vs ${player2}`);
        
        const nextGameId = gameManager.createGame(nextGameSettings);
        
        if (!nextGameId) {
          return sendError(ws, 'Failed to create new game');
        }
        
        console.log(`New game created with ID: ${nextGameId}`);
        
        const addPlayer1Result = gameManager.addPlayer(nextGameId, player1, 1);
        const addPlayer2Result = gameManager.addPlayer(nextGameId, player2, 2);
        
        console.log(`Add player 1 result: ${addPlayer1Result}`);
        console.log(`Add player 2 result: ${addPlayer2Result}`);
        
        if (!addPlayer1Result || !addPlayer2Result) {
          console.error(`Failed to add players to new game ${nextGameId}`);
          return sendError(ws, 'Failed to add players to new game');
        }
        
        // Update match with gameId
        tournamentManager.updateMatchGameId(nextMatchId, nextGameId);
        
        const nextGameState = gameManager.getGameState(nextGameId);
        
        if (!nextGameState) {
          console.error(`Failed to get game state for new game ${nextGameId}`);
          return sendError(ws, 'Failed to get game state for new game');
        }
        
        // Send response with new game info
        console.log(`Sending next_match response for matchId: ${nextMatchId}, gameId: ${nextGameId}`);
        
        ws.send(JSON.stringify({
          type: 'next_match',
          matchId: nextMatchId,
          gameId: nextGameId,
          gameState: nextGameState
        }));
      } catch (error) {
        console.error('Error in handleNext:', error);
        sendError(ws, 'Error processing next round: ' + error.message);
      }
    }
  });
  
  done();
}

module.exports = fp(websocketHandler, {
  name: 'websocket-handler'
});