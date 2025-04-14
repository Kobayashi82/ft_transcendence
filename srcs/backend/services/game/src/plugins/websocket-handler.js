"use strict";

const fp = require('fastify-plugin');
const gameManager = require('./game-manager');
const tournamentManager = require('./tournament-manager');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

async function websocketHandler(fastify) {

  function releasePlayersFromTournament(tournamentId) {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) return false;   

    // For each match in the tournament, get the game and release players
    for (const matchId of tournament.matches) {
      const match = tournamentManager.matches.get(matchId);
      
      if (match && match.gameId) {
        const game = gameManager.getGame(match.gameId);
        
        if (game) {
          if (game.player1) gameManager.players.delete(game.player1);         
          if (game.player2) gameManager.players.delete(game.player2);
        }
      }
    }
    
    sendTournamentResultsToStats(tournamentId);
    return true;
  }
  
  async function sendTournamentResultsToStats(tournamentId) {
    try {
      const tournament = tournamentManager.getTournament(tournamentId);
      if (!tournament || tournament.resultsSent) return;
     
      const finalMatch = tournamentManager.matches.get(tournament.matches[2]);     
      if (!finalMatch || !finalMatch.gameId) return;
      
      const finalGame = gameManager.getGame(finalMatch.gameId);
      const finalGameState = gameManager.getGameState(finalMatch.gameId);      
      if (!finalGame || !finalGameState) return;
      
      // Get games
      const winner = finalGameState.player1.score > finalGameState.player2.score ? finalGameState.player1.name : finalGameState.player2.name;
      const secondPlace = finalGameState.player1.score > finalGameState.player2.score ? finalGameState.player2.name : finalGameState.player1.name;
      const semifinal1Match = tournamentManager.matches.get(tournament.matches[0]);
      const semifinal2Match = tournamentManager.matches.get(tournament.matches[1]);
      const semifinal1GameState = semifinal1Match?.gameId ? gameManager.getGameState(semifinal1Match.gameId) : null;
      const semifinal2GameState = semifinal2Match?.gameId ? gameManager.getGameState(semifinal2Match.gameId) : null;
      
      // Get losers of semifinals (3rd and 4th place)
      let thirdPlace = null;
      let fourthPlace = null;
      if (semifinal1GameState) thirdPlace = semifinal1GameState.player1.score > semifinal1GameState.player2.score ? semifinal1GameState.player2.name : semifinal1GameState.player1.name;     
      if (semifinal2GameState) fourthPlace = semifinal2GameState.player1.score > semifinal2GameState.player2.score ? semifinal2GameState.player2.name : semifinal2GameState.player1.name;
  
      // Get tournament settings
      const tournamentSettings = {
        ballSpeed: tournament.settings?.ballSpeed || "medium",
        paddleSize: tournament.settings?.paddleSize || "medium",
        speedIncrement: tournament.settings?.accelerationEnabled || false,
        pointsToWin: tournament.settings?.winningScore || 5
      }
     
      // Create payload
      const tournamentPayload = {
        name: tournament.name || tournament.tournamentName || tournamentManager.getTournamentSettings(tournamentId)?.tournamentName || `Tournament ${tournamentId.substring(0, 8)}`,
        start_time: new Date(tournament.createdAt).toISOString(),
        end_time: new Date().toISOString(),
        settings: tournamentSettings,
        status: 'completed',
        players: tournament.players.map(playerId => ({ user_id: playerId }))
      }

      const gameEntry1 = semifinal1Match?.gameId ? gameManager.games.get(semifinal1Match.gameId) : null;
      const gameEntry2 = semifinal2Match?.gameId ? gameManager.games.get(semifinal2Match.gameId) : null;
      const gameEntryFinal = finalMatch?.gameId ? gameManager.games.get(finalMatch.gameId) : null;
      const semi1GameState = semifinal1Match?.gameId ? gameManager.getGameState(semifinal1Match.gameId) : null;
      const semi2GameState = semifinal2Match?.gameId ? gameManager.getGameState(semifinal2Match.gameId) : null;

      function realTimePlayed(gameEntry, gameState) {
        if (!gameEntry || !gameState) return { startTime: null, endTime: null }
        
        const startTime = new Date(gameEntry.startTime || Date.now());
        const finishTime = gameEntry.finishTime ? new Date(gameEntry.finishTime) : new Date();

        let totalPausedMs = 0;
        if (gameState.timing && gameState.timing.totalPausedTime) totalPausedMs = gameState.timing.totalPausedTime;
        const effectiveEndTime = new Date(finishTime.getTime() - totalPausedMs);
        
        return { startTime, endTime: effectiveEndTime }
      }
      
      tournamentPayload.games = [];
      
      const semi1Times = realTimePlayed(gameEntry1, semi1GameState);
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
      
      const semi2Times = realTimePlayed(gameEntry2, semi2GameState);
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
      
      const finalTimes = realTimePlayed(gameEntryFinal, finalGameState);
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
      
      // Create the tournament
      const statsService = fastify.config.services.stats;
      const createResponse = await axios.post(`${statsService.url}/tournaments`, tournamentPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: statsService.timeout
      });
      
      const tournamentDbId = createResponse.data.id;
      if (tournament.dbId === undefined) tournament.dbId = tournamentDbId;

      // Update the tournament results with player positions
      const results = tournament.players.map(playerId => {
        let position = 4;

        if      (playerId === winner)       position = 1;
        else if (playerId === secondPlace)  position = 2;
        else if (playerId === thirdPlace)   position = 3;
        else if (playerId === fourthPlace)  position = 4;
        
        return { user_id: playerId, position: position }
      });
      
      // Send Results to stats service
      await axios.post(`${statsService.url}/tournaments/${tournamentDbId}/results`, results, {
        headers: { 'Content-Type': 'application/json' },
        timeout: statsService.timeout
      });
      
      tournament.resultsSent = true;
      return true;
    } catch (error) {}
  }

  fastify.get('/game/ws/pong', { websocket: true }, (connection, _) => {
    const ws = connection.socket;
    const clientId = uuidv4();
           
    // DISCONNECT
    ws.on('close', () => {
      const clientEntry = gameManager.getClientInfo(clientId);
      if (clientEntry && clientEntry.gameId) {
        const game = gameManager.getGame(clientEntry.gameId);
        if (game && ['playing', 'paused', 'waiting'].includes(game.gameState)) gameManager.cancelGame(clientEntry.gameId);
      }
      gameManager.unregisterClient(clientId);
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
          case 'start':     handleStart(data, clientId, ws);            break;
          case 'move':      handleMove(data, clientId, ws);             break;
          case 'position':  handlePosition(data, clientId, ws);         break;
          case 'pause':     handlePause(data, clientId, ws);            break;
          case 'resume':    handleResume(data, clientId, ws);           break;
          case 'cancel':    handleCancel(data, clientId, ws);           break;
          case 'state':     handleState(data, clientId, ws);            break;
          case 'next':      handleNext(data, clientId, ws);             break;
          case 'ping':      ws.send(JSON.stringify({ type: 'pong' }));  break;
          default:          sendError(ws, `Unknown message type: ${data.type}`);
        }
      } catch (error) { sendError(ws, 'Invalid message format'); }
    });

    // START
    function handleStart(data, _, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in start message');
      let gameId = data.gameId;
      
      // Check if is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      if (gameManager.startGame(gameId)) {
        ws.send(JSON.stringify({ type: 'started', gameId: data.gameId, gameState: gameManager.getGameState(gameId) }));
      } else sendError(ws, 'Unable to start game');
    }

    // PAUSE
    function handlePause(data, _, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in pause message');      
      let gameId = data.gameId;

      // Check if is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;

      if (gameManager.pauseGame(gameId)) {
        ws.send(JSON.stringify({ type: 'paused', gameId: data.gameId, gameState: gameManager.getGameState(gameId) }));
      } else sendError(ws, 'Unable to pause game');
    }
    
    // RESUME
    function handleResume(data, _, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in resume message');
      let gameId = data.gameId;
      
      // Check if is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);      
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      if (gameManager.resumeGame(gameId)) {
        ws.send(JSON.stringify({ type: 'resumed', gameId: data.gameId, gameState: gameManager.getGameState(gameId) }));
      } else sendError(ws, 'Unable to resume game');
    }

    // CANCEL
    function handleCancel(data, _, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in cancel message');
      let gameId = data.gameId;

      let tournamentId = null;
      
      // Check if is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails) {
        tournamentId = matchDetails.tournamentId;
        if (matchDetails.gameId) gameId = matchDetails.gameId;
      }
      
      if (gameManager.cancelGame(gameId)) {
        if (tournamentId) {
          releasePlayersFromTournament(tournamentId);
          tournamentManager.cancelTournament(tournamentId);
        }
        ws.send(JSON.stringify({ type: 'cancelled', gameId: data.gameId, gameState: gameManager.getGameState(gameId), tournamentCancelled: tournamentId ? true : false }));
      } else sendError(ws, `Unable to cancel game: ${data.gameId}`);
    }

    // STATE
    function handleState(data, clientId, ws) {
      if (!data.gameId) return sendError(ws, 'Missing gameId in state message');    
      let gameId = data.gameId;
      
      // Check if is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      const gameState = gameManager.getGameState(gameId);
      if (gameState) {
        // Register this client with the game manager so it receives updates
        gameManager.registerClient(gameId, clientId, ws, data.playerName, data.isSpectator || false);
        
        ws.send(JSON.stringify({ type: 'state', gameId: data.gameId, data: gameState }));
      } else {
        if (matchDetails) sendError(ws, `Tournament match not yet started: ${data.gameId}`);
        else              sendError(ws, `Game not found: ${data.gameId}`);
      }
    }

    // PADDLE MOVE
    function handleMove(data, _, ws) {
      if (!data.gameId || data.player === undefined || !data.direction) return sendError(ws, 'Missing parameters in move message. Required: gameId, player, direction');     
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      const movementDirection = data.direction === 'stop' ? null : data.direction;
      const success = gameManager.handlePaddleMove(gameId, data.player, movementDirection);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }
    
    // PADDLE POSITION
    function handlePosition(data, _, ws) {
      if (!data.gameId || data.player === undefined || data.y === undefined) return sendError(ws, 'Missing parameters in position message. Required: gameId, player, y');     
      let gameId = data.gameId;
      
      // Check if this is a tournament match ID
      const matchDetails = tournamentManager.matches.get(gameId);
      if (matchDetails && matchDetails.gameId) gameId = matchDetails.gameId;
      
      const success = gameManager.setPaddlePosition(gameId, data.player, data.y);
      if (!success) sendError(ws, `Game not found: ${data.gameId}`);
    }

    // NEXT MATCH
    async function handleNext(data, _, ws) {
      try {
        if (!data.gameId) return sendError(ws, 'Missing gameId in next message');

        let gameId = data.gameId;
        let matchId = data.gameId;
        
        // Check if this is a tournament match ID
        const matchDetails = tournamentManager.matches.get(matchId);        
        if (!matchDetails) return sendError(ws, `Tournament match not found: ${matchId}`);        
        if (matchDetails.gameId) gameId = matchDetails.gameId;
        
        // Check if the game has finished and is in 'next' state
        const gameState = gameManager.getGameState(gameId);
        if (!gameState || gameState.gameState !== 'next') return sendError(ws, `Game is not ready for next round: ${gameId}`);
        
        // Record the exact timestamp for the end of this game
        const exactFinishTime = Date.now();
        
        // Set the game as finished
        const gameEntry = gameManager.games.get(gameId);
        if (!gameEntry) return sendError(ws, `Game entry not found: ${gameId}`);
        gameEntry.finishTime = exactFinishTime;
       
        // Get tournament data to check match sequence
        const tournamentData = tournamentManager.getTournament(matchDetails.tournamentId);
        if (!tournamentData) return sendError(ws, `Tournament not found: ${matchDetails.tournamentId}`);
        const currentMatchIndex = tournamentData.matches.findIndex(id => id === matchId);
        if (currentMatchIndex === -1) return sendError(ws, `Match not found in tournament: ${matchId}`);

        // Find the next match
        let nextMatchId;
        if      (currentMatchIndex === 0) nextMatchId = tournamentData.matches[1];
        else if (currentMatchIndex === 1) nextMatchId = tournamentData.matches[2];
        else {
          releasePlayersFromTournament(matchDetails.tournamentId);
          ws.send(JSON.stringify({ type: 'tournament_completed', tournamentId: matchDetails.tournamentId, message: 'Tournament has completed' }));
          return;
        }
        
        // Get next match details
        const nextMatchDetails = tournamentManager.getMatchDetails(nextMatchId);
        if (nextMatchDetails.gameId) {
          gameManager.cancelGame(nextMatchDetails.gameId);
          nextMatchDetails.gameId = null;
        }

        const nextGameSettings = { 
          ...gameState.settings,
          tournamentMode: true,
          tournamentRound: currentMatchIndex === 0 ? 1 : 2,
          isSecondSemifinal: currentMatchIndex === 0
        }

        if (currentMatchIndex === 1) {
          // Going to final
          const firstSemiMatch = tournamentManager.matches.get(tournamentData.matches[0]);
          const secondSemiMatch = tournamentManager.matches.get(tournamentData.matches[1]);
          if (!firstSemiMatch || !secondSemiMatch) return sendError(ws, 'Cannot determine players for final match');
          
          const firstSemiGame = gameManager.getGame(firstSemiMatch.gameId);
          const secondSemiGame = gameManager.getGame(secondSemiMatch.gameId);
          if (!firstSemiGame || !secondSemiGame) return sendError(ws, 'Semifinal games not found');
          
          // Determine winners from both semifinals
          nextMatchDetails.player1 = firstSemiGame.player1Score > firstSemiGame.player2Score ? firstSemiGame.player1 : firstSemiGame.player2;
          nextMatchDetails.player2 = secondSemiGame.player1Score > secondSemiGame.player2Score ? secondSemiGame.player1 : secondSemiGame.player2;
        }
        
        const nextGameId = tournamentManager.createGameForMatch(nextMatchId, nextGameSettings);
        if (!nextGameId) return sendError(ws, 'Failed to create new game');

        const nextGameState = gameManager.getGameState(nextGameId);
        if (!nextGameState) return sendError(ws, 'Failed to get game state for new game');
 
        ws.send(JSON.stringify({ type: 'next_match', matchId: nextMatchId, gameId: nextGameId, gameState: nextGameState }));
      } catch (error) { sendError(ws, 'Error processing next round: ' + error.message); }
    }
  });
  
}

module.exports = fp(websocketHandler, { name: 'websocket-handler' });
