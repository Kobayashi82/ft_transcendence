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
      
      // Avoid sending duplicate results
      if (tournament.resultsSent) {
        console.log(`Tournament ${tournamentId} results already sent`);
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
      const finalGameState = gameManager.getGameState(finalMatch.gameId);
      
      if (!finalGame || !finalGameState) {
        console.log('Final game not found');
        return;
      }
      
      // Determine winner and runner-up (1st and 2nd place)
      const winner = finalGameState.player1.score > finalGameState.player2.score ? 
        finalGameState.player1.name : finalGameState.player2.name;
      const runnerUp = finalGameState.player1.score > finalGameState.player2.score ? 
        finalGameState.player2.name : finalGameState.player1.name;
      
      // Get semifinal matches to determine 3rd and 4th place
      const semifinal1MatchId = tournament.matches[0];
      const semifinal2MatchId = tournament.matches[1];
      const semifinal1Match = tournamentManager.matches.get(semifinal1MatchId);
      const semifinal2Match = tournamentManager.matches.get(semifinal2MatchId);
      
      // Get semifinal games
      const semifinal1GameState = semifinal1Match?.gameId ? gameManager.getGameState(semifinal1Match.gameId) : null;
      const semifinal2GameState = semifinal2Match?.gameId ? gameManager.getGameState(semifinal2Match.gameId) : null;
      
      // Get losers of semifinals (3rd and 4th place)
      let thirdPlace = null;
      let fourthPlace = null;
      
      if (semifinal1GameState) {
        const semifinal1Loser = semifinal1GameState.player1.score > semifinal1GameState.player2.score ? 
          semifinal1GameState.player2.name : semifinal1GameState.player1.name;
        thirdPlace = semifinal1Loser;
      }
      
      if (semifinal2GameState) {
        const semifinal2Loser = semifinal2GameState.player1.score > semifinal2GameState.player2.score ? 
          semifinal2GameState.player2.name : semifinal2GameState.player1.name;
        if (thirdPlace === null) {
          thirdPlace = semifinal2Loser;
        } else {
          fourthPlace = semifinal2Loser;
        }
      }
      
      console.log(`Tournament positions - 1st: ${winner}, 2nd: ${runnerUp}, 3rd: ${thirdPlace}, 4th: ${fourthPlace}`);
      
      // Get actual game settings to format them properly
      const tournamentSettings = {
        ballSpeed: tournament.settings?.ballSpeed || "medium",
        paddleSize: tournament.settings?.paddleSize || "medium",
        speedIncrement: tournament.settings?.accelerationEnabled || false,
        pointsToWin: tournament.settings?.winningScore || 5
      };
      
      // Create tournament result payload - match format to what the model expects
      const tournamentPayload = {
        name: `Tournament ${tournamentId.substring(0, 8)}`, // Generating a name based on ID
        start_time: new Date(tournament.createdAt).toISOString(),
        end_time: new Date().toISOString(),
        settings: tournamentSettings,
        status: 'completed',
        players: tournament.players.map(playerId => ({ user_id: playerId }))
      };
      
      console.log(`Sending tournament with settings: ${JSON.stringify(tournamentSettings)}`);
      
      // Obtener entradas del game manager para acceder a los tiempos reales
      const gameEntry1 = semifinal1Match?.gameId ? gameManager.games.get(semifinal1Match.gameId) : null;
      const gameEntry2 = semifinal2Match?.gameId ? gameManager.games.get(semifinal2Match.gameId) : null;
      const gameEntryFinal = finalMatch?.gameId ? gameManager.games.get(finalMatch.gameId) : null;
      
      // Obtener estados del juego para información de pausa
      const semi1GameState = semifinal1Match?.gameId ? gameManager.getGameState(semifinal1Match.gameId) : null;
      const semi2GameState = semifinal2Match?.gameId ? gameManager.getGameState(semifinal2Match.gameId) : null;

      // Calcular tiempos reales para cada juego, ajustando por pausas si es necesario
      function calculateEffectiveTimes(gameEntry, gameState) {
        if (!gameEntry || !gameState) return { startTime: null, endTime: null };
        
        // Usar el tiempo de inicio real registrado cuando se creó el juego
        const startTime = new Date(gameEntry.startTime || Date.now());
        
        // CORREGIDO: Usar el tiempo de finalización específico de este juego en lugar de la hora actual
        // Si no hay un tiempo de finalización registrado, entonces usar el tiempo actual como fallback
        const finishTime = gameEntry.finishTime ? new Date(gameEntry.finishTime) : new Date();
        
        // Calcular la duración efectiva considerando pausas
        let totalPausedMs = 0;
        if (gameState.timing && gameState.timing.totalPausedTime) {
          totalPausedMs = gameState.timing.totalPausedTime;
          console.log(`Game ${gameEntry.id} had ${totalPausedMs}ms of paused time`);
        }
        
        // Tiempo de finalización ajustado por pausas (tiempo real = tiempo total - tiempo pausado)
        const effectiveEndTime = new Date(finishTime.getTime() - totalPausedMs);
        
        // Calcular y mostrar la duración real
        const effectiveDurationMs = effectiveEndTime.getTime() - startTime.getTime();
        console.log(`Game ${gameEntry.id} effective duration: ${effectiveDurationMs / 1000} seconds`);
        
        return { 
          startTime, 
          endTime: effectiveEndTime 
        };
      }
      
      // Calcular tiempos efectivos para cada partida
      const semi1Times = calculateEffectiveTimes(gameEntry1, semi1GameState);
      const semi2Times = calculateEffectiveTimes(gameEntry2, semi2GameState);
      const finalTimes = calculateEffectiveTimes(gameEntryFinal, finalGameState);
      
      console.log(`Semifinal 1 times: ${semi1Times.startTime?.toISOString() || 'unknown'} - ${semi1Times.endTime?.toISOString() || 'unknown'}`);
      console.log(`Semifinal 2 times: ${semi2Times.startTime?.toISOString() || 'unknown'} - ${semi2Times.endTime?.toISOString() || 'unknown'}`);
      console.log(`Final times: ${finalTimes.startTime?.toISOString() || 'unknown'} - ${finalTimes.endTime?.toISOString() || 'unknown'}`);
      
      // Incluimos los datos de los juegos del torneo con los tiempos reales
      tournamentPayload.games = [];
      
      if (semi1GameState && semi1Times.startTime && semi1Times.endTime) {
        tournamentPayload.games.push({
          start_time: semi1Times.startTime.toISOString(),
          end_time: semi1Times.endTime.toISOString(),
          settings: tournamentSettings,
          players: [
            { user_id: semi1GameState.player1.name, score: semi1GameState.player1.score },
            { user_id: semi1GameState.player2.name, score: semi1GameState.player2.score }
          ]
        });
      }
      
      if (semi2GameState && semi2Times.startTime && semi2Times.endTime) {
        tournamentPayload.games.push({
          start_time: semi2Times.startTime.toISOString(),
          end_time: semi2Times.endTime.toISOString(),
          settings: tournamentSettings,
          players: [
            { user_id: semi2GameState.player1.name, score: semi2GameState.player1.score },
            { user_id: semi2GameState.player2.name, score: semi2GameState.player2.score }
          ]
        });
      }
      
      if (finalGameState && finalTimes.startTime && finalTimes.endTime) {
        tournamentPayload.games.push({
          start_time: finalTimes.startTime.toISOString(),
          end_time: finalTimes.endTime.toISOString(),
          settings: tournamentSettings,
          players: [
            { user_id: finalGameState.player1.name, score: finalGameState.player1.score },
            { user_id: finalGameState.player2.name, score: finalGameState.player2.score }
          ]
        });
      }
      
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
      
      // Guardamos el ID de la base de datos del torneo para usarlo en los juegos
      if (tournament.dbId === undefined) {
        tournament.dbId = tournamentDbId;
        console.log(`Saved database ID ${tournamentDbId} for tournament ${tournamentId}`);
      }
      
      // Now update the tournament results with player positions
      const results = tournament.players.map(playerId => {
        let position = 0;
        if (playerId === winner) position = 1;
        else if (playerId === runnerUp) position = 2;
        else if (playerId === thirdPlace) position = 3;
        else if (playerId === fourthPlace) position = 4;
        else position = 4; // Default to last place if can't be determined
        
        return {
          user_id: playerId,
          position: position
        };
      });
      
      // Send final results to stats service
      await axios.post(`${statsService.url}/tournaments/${tournamentDbId}/results`, results, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: statsService.timeout
      });
      
      console.log(`Tournament results sent to stats service: ${tournamentId}`);
      
      // Mark results as sent
      tournament.resultsSent = true;
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

    // SEND ERROR
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
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      if (gameManager.startGame(gameId)) {
        ws.send(JSON.stringify({
          type: 'started',
          gameId: data.gameId,
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
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;

      if (gameManager.pauseGame(gameId)) {
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
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      if (gameManager.resumeGame(gameId)) {
        ws.send(JSON.stringify({
          type: 'resumed',
          gameId: data.gameId,
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
        tournamentId = matchDetails.tournamentId;
        if (matchDetails.gameId) gameId = matchDetails.gameId;
      }
      
      if (gameManager.cancelGame(gameId)) {
        if (tournamentId) {
          console.log(`Canceling tournament ${tournamentId} due to match cancellation`);
          releasePlayersFromTournament(tournamentId);
          tournamentManager.cancelTournament(tournamentId);
        }
        ws.send(JSON.stringify({
          type: 'cancelled',
          gameId: data.gameId,
          gameState: gameManager.getGameState(gameId),
          tournamentCancelled: tournamentId ? true : false
        }));
      } else sendError(ws, `Unable to cancel game: ${data.gameId}`);
    }

    // STATE
    function handleState(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in state message');    
      let gameId = data.gameId;
      
      // First, check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      const gameState = gameManager.getGameState(gameId);
      if (gameState) {
        // Register this client with the game manager so it receives updates
        gameManager.registerClient(gameId, clientId, ws, data.playerName, data.isSpectator || false);
        
        ws.send(JSON.stringify({
          type: 'state',
          gameId: data.gameId,
          data: gameState
        }));
      } else {
        if (matchDetails) sendError(ws, `Tournament match not yet started: ${data.gameId}`);
        else              sendError(ws, `Game not found: ${data.gameId}`);
      }
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

    // Handle tournament "NEXT" action for progression between rounds
    async function handleNext(data, clientId, ws) {
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
        
        // CRÍTICO: Registrar un timestamp exacto para el final de este juego AHORA
        const exactFinishTime = Date.now();
        
        // Obtener la entrada del juego y establecer su tiempo de finalización
        const gameEntry = gameManager.games.get(gameId);
        if (!gameEntry) {
          console.error(`Game entry not found for game ${gameId}`);
          return sendError(ws, `Game entry not found: ${gameId}`);
        }
        
        // Guardar tiempo de finalización exacto
        gameEntry.finishTime = exactFinishTime;
        console.log(`Registered EXACT finishTime for game ${gameId}: ${new Date(exactFinishTime).toISOString()}`);
        
        // Calcular la duración real de la partida
        const startTime = gameEntry.startTime || Date.now() - 10000; // Fallback de 10 segundos si no hay startTime
        let totalPausedMs = 0;
        
        // Calcular tiempo en pausa con mayor precisión
        if (gameState.timing && gameState.timing.totalPausedTime) {
          totalPausedMs = gameState.timing.totalPausedTime;
          console.log(`Game had ${totalPausedMs}ms of paused time`);
        }
        
        // CRÍTICO: Calcular tiempo efectivo de juego con máxima precisión
        const effectiveDurationMs = (exactFinishTime - startTime) - totalPausedMs;
        const effectiveEndTime = new Date(startTime + effectiveDurationMs).toISOString();
        
        console.log(`Game ${gameId} statistics:`);
        console.log(`- Start time: ${new Date(startTime).toISOString()}`);
        console.log(`- Finish time: ${new Date(exactFinishTime).toISOString()}`);
        console.log(`- Paused time: ${totalPausedMs}ms`);
        console.log(`- Effective duration: ${effectiveDurationMs / 1000} seconds`);
        console.log(`- Effective end time: ${effectiveEndTime}`);
        
        // IMPORTANTE: Guardar explícitamente los resultados en stats
        console.log(`Saving game results for tournament game ${gameId}, tournament: ${matchDetails.tournamentId}`);
        const statsService = require('../config').services.stats;
        const axios = require('axios');
        
        // CRÍTICO: Marcar el juego como ya enviado para evitar duplicaciones ANTES de enviarlo
        // Esto evita posibles condiciones de carrera con el loop de update en game-manager
        // gameEntry.sentToStats = true;
        // console.log(`Marked game ${gameId} as already sent to stats to prevent duplication`);
        
        // // Creamos el payload con tiempos extremadamente precisos
        // const gamePayload = {
        //   tournament_id: tournamentManager.tournaments.get(matchDetails.tournamentId)?.dbId,
        //   start_time: new Date(startTime).toISOString(),
        //   end_time: effectiveEndTime, // Tiempo de finalización efectivo
        //   settings: {
        //     ballSpeed: gameState.settings?.ballSpeed || 'medium',
        //     paddleSize: gameState.settings?.paddleSize || 'medium',
        //     speedIncrement: gameState.settings?.accelerationEnabled || false,
        //     pointsToWin: gameState.config?.winningScore || 5
        //   },
        //   players: [
        //     {
        //       user_id: gameState.player1.name,
        //       score: gameState.player1.score
        //     },
        //     {
        //       user_id: gameState.player2.name,
        //       score: gameState.player2.score
        //     }
        //   ]
        // };
        
        // // Añadimos información sobre el tipo de partido
        // if (matchDetails.round === 2) {
        //   gamePayload.match_type = "Final";
        // } else {
        //   const isSecond = tournamentManager.tournaments.get(matchDetails.tournamentId).matches.indexOf(matchId) === 1;
        //   gamePayload.match_type = isSecond ? "Semifinal 2" : "Semifinal 1";
        // }
        
        //console.log(`Sending tournament game to stats: ${JSON.stringify(gamePayload)}`);
        
        // // CRÍTICO: Guardar el tiempo del juego actual antes de crear/pasar a la siguiente ronda
        // try {
        //   const response = await axios.post(`${statsService.url}/games`, gamePayload, {
        //     headers: {
        //       'Content-Type': 'application/json'
        //     },
        //     timeout: statsService.timeout
        //   });
          
        //   console.log(`Tournament game saved to stats with ID: ${response.data.id}`);
          
        //   // Si es un partido de torneo, guardar el ID de la base de datos para referencia futura
        //   const match = tournamentManager.matches.get(matchId);
        //   if (match) {
        //     match.statsGameId = response.data.id;
        //     console.log(`Saved stats game ID ${response.data.id} for match ${matchId}`);
        //   }
        // } catch (error) {
        //   console.error(`Error saving tournament game to stats: ${error.message}`);
        //   // No quitamos el flag sentToStats aunque falle, para evitar duplicaciones
        // }
        
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
        
        // Check if the next match already has a game ID - Si tiene, NO reusar ese juego
        // porque posiblemente tiene tiempos incorrectos
        if (nextMatchDetails.gameId) {
          console.log(`Clearing previous game ID ${nextMatchDetails.gameId} for next match`);
          
          // Cancelar el juego anterior si existe
          gameManager.cancelGame(nextMatchDetails.gameId);
          
          // Limpiar el gameId para que se cree uno nuevo
          nextMatchDetails.gameId = null;
        }
        
        // Preparar ajustes para el siguiente juego
        const nextGameSettings = { 
          ...gameState.settings,
          tournamentMode: true,
          tournamentRound: isFirstSemifinal ? 1 : 2, // Semifinal 2 mantiene ronda 1, Final es ronda 2
          isSecondSemifinal: isFirstSemifinal // Solo activar si vamos a la segunda semifinal
        };
        
        console.log(`Next game settings: ${JSON.stringify(nextGameSettings)}`);
        
        let player1, player2;
        
        if (isSecondSemifinal) {
          // Going to final - determine players from semifinal winners
          console.log(`Determining players for final match from semifinal winners`);
          
          const firstSemiMatch = tournamentManager.matches.get(tournamentData.matches[0]);
          const secondSemiMatch = tournamentManager.matches.get(tournamentData.matches[1]);
          
          if (!firstSemiMatch || !secondSemiMatch) {
            return sendError(ws, 'Cannot determine players for final match');
          }
          
          const firstSemiGame = gameManager.getGame(firstSemiMatch.gameId);
          const secondSemiGame = gameManager.getGame(secondSemiMatch.gameId);
          
          if (!firstSemiGame || !secondSemiGame) {
            return sendError(ws, 'Semifinal games not found');
          }
          
          // Determine winners from both semifinals
          const firstSemiWinner = firstSemiGame.player1Score > firstSemiGame.player2Score ? 
            firstSemiGame.player1 : firstSemiGame.player2;
            
          const secondSemiWinner = secondSemiGame.player1Score > secondSemiGame.player2Score ?
            secondSemiGame.player1 : secondSemiGame.player2;
            
          console.log(`First semifinal winner: ${firstSemiWinner}`);
          console.log(`Second semifinal winner: ${secondSemiWinner}`);
          
          player1 = firstSemiWinner;
          player2 = secondSemiWinner;
          
          // Actualizar los jugadores en la información del partido final
          nextMatchDetails.player1 = player1;
          nextMatchDetails.player2 = player2;
        } else {
          // Next semifinal - use predefined players
          console.log(`Using predefined players for second semifinal`);
          player1 = nextMatchDetails.player1;
          player2 = nextMatchDetails.player2;
        }
        
        console.log(`Creating game with players: ${player1} vs ${player2}`);
        
        // USAR EL NUEVO MÉTODO que garantiza tiempos independientes para cada partida
        const nextGameId = tournamentManager.createGameForMatch(nextMatchId, nextGameSettings);
        
        if (!nextGameId) {
          return sendError(ws, 'Failed to create new game');
        }
        
        console.log(`New game created with ID: ${nextGameId}`);
        
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