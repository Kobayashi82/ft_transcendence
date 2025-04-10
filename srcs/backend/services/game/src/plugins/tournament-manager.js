"use strict";

// Evitamos la importación directa al inicio
// const gameManager = require('./game-manager');
const { v4: uuidv4 } = require('uuid');

class TournamentManager {
  constructor() {
    this.tournaments = new Map();
    this.matches = new Map();
    // Vamos a añadir una referencia a gameManager que se establecerá más tarde
    this.gameManager = null;
  }
  
  // Nuevo método para establecer la referencia a gameManager
  setGameManager(gameManager) {
    this.gameManager = gameManager;
  }
  
  // Shuffle array
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // CREATE
  createTournament(players, settings) {
    if (players.length !== 4) {
      throw new Error('Tournament requires exactly 4 players');
    }
    
    const shuffledPlayers = this.shuffleArray(players);   
    const tournamentId = uuidv4();   
    const tournament = {
      id: tournamentId,
      createdAt: new Date(),
      settings: settings,
      players: shuffledPlayers,
      matches: []
    };
    
    const semifinal1Id = this.createMatch(tournamentId, 1, shuffledPlayers[0], shuffledPlayers[1], settings);
    const semifinal2Id = this.createMatch(tournamentId, 1, shuffledPlayers[2], shuffledPlayers[3], settings);
    
    // Create final match with placeholder players (will be determined by semifinal winners)
    const finalId = uuidv4();
    
    // Store match IDs in tournament
    tournament.matches.push(semifinal1Id);
    tournament.matches.push(semifinal2Id);
    tournament.matches.push(finalId);
    
    // Store additional info in matches
    this.matches.set(semifinal1Id, { 
      tournamentId, 
      round: 1, 
      nextMatchId: finalId, 
      player1Position: 1,
      player1: shuffledPlayers[0],
      player2: shuffledPlayers[1]
    });
    this.matches.set(semifinal2Id, { 
      tournamentId, 
      round: 1, 
      nextMatchId: finalId, 
      player1Position: 2,
      player1: shuffledPlayers[2],
      player2: shuffledPlayers[3]
    });
    
    // Also store the final match in the matches map with placeholder values
    this.matches.set(finalId, {
      tournamentId,
      round: 2,
      player1: null, // Will be determined by semifinal winners
      player2: null, // Will be determined by semifinal winners
      gameId: null
    });
    
    // Store tournament
    this.tournaments.set(tournamentId, tournament);
    
    // IMPORTANTE: Registrar este torneo en el gameManager para que pueda ser referenciado
    // solo si tenemos acceso a gameManager
    if (this.gameManager && typeof this.gameManager.registerTournament === 'function') {
      this.gameManager.registerTournament(tournamentId, tournament);
      console.log(`Tournament ${tournamentId} registered in gameManager with ${tournament.matches.length} matches`);
    } else {
      console.log(`Warning: gameManager not available or registerTournament is not a function. Tournament ${tournamentId} not registered in gameManager.`);
    }
    
    return {
      tournamentId,
      firstMatchId: semifinal1Id,
      semifinal2Id: semifinal2Id,
      finalId: finalId,
      settings,
      players: shuffledPlayers
    };
  }
  
  // Create a match for the tournament
  createMatch(tournamentId, round, player1, player2, settings) {
    const matchId = uuidv4();
    
    // Store match info
    this.matches.set(matchId, {
      tournamentId,
      round,
      player1,
      player2,
      gameId: null
    });
    
    return matchId;
  }
  
  // Get match details
  getMatchDetails(matchId) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    return match;
  }
  
  // Update match with game ID
  updateMatchGameId(matchId, gameId) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    match.gameId = gameId;
  }
  
  // Get tournament data
  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId);
  }
  
  // Find the other semifinal match in the same tournament
  getOtherSemifinal(matchId) {
    const match = this.matches.get(matchId);
    if (!match || match.round !== 1) {
      return null;
    }
    
    const tournamentData = this.tournaments.get(match.tournamentId);
    if (!tournamentData) {
      return null;
    }
    
    // Find the other semifinal (both have round 1)
    const otherSemifinalId = tournamentData.matches.find(id => {
      const m = this.matches.get(id);
      return m && m.round === 1 && id !== matchId;
    });
    
    if (!otherSemifinalId) {
      return null;
    }
    
    return this.matches.get(otherSemifinalId);
  }
  
  // CANCEL
  cancelTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    
    // Cancel all active games
    for (const matchId of tournament.matches) {
      const match = this.matches.get(matchId);
      if (match && match.gameId) {
        this.gameManager.cancelGame(match.gameId);
      }
    }
    
    // Remove tournament
    this.tournaments.delete(tournamentId);
    
    return true;
  }
  
  // Avanzar a la siguiente ronda del torneo tras completar una partida
  advanceToNextRound(matchId, winnerId) {
    try {
      // Get match details
      const match = this.matches.get(matchId);
      if (!match) {
        throw new Error(`Match not found: ${matchId}`);
      }
      
      console.log(`Tournament match ${matchId} completed, winner: ${winnerId}`);
      
      // Verify this match is part of a tournament and has a next match
      if (!match.nextMatchId) {
        console.log(`Match ${matchId} has no next match - this must be the final`);
        return null;
      }
      
      // Get the next match
      const nextMatch = this.matches.get(match.nextMatchId);
      if (!nextMatch) {
        throw new Error(`Next match not found: ${match.nextMatchId}`);
      }
      
      console.log(`Advancing winner ${winnerId} to match ${match.nextMatchId}`);
      
      // Update next match with this match's winner
      if (match.player1Position === 1) {
        nextMatch.player1 = winnerId;
      } else {
        nextMatch.player2 = winnerId;
      }
      
      // Check if both players for next match are ready
      if (nextMatch.player1 && nextMatch.player2) {
        console.log(`Next match ${match.nextMatchId} is ready to start with players ${nextMatch.player1} and ${nextMatch.player2}`);
        return {
          matchId: match.nextMatchId,
          player1: nextMatch.player1,
          player2: nextMatch.player2,
          round: nextMatch.round
        };
      }
      
      console.log(`Waiting for other semifinal to complete before starting next match`);
      return null;
    } catch (error) {
      console.error(`Error advancing to next round: ${error.message}`);
      return null;
    }
  }
  
  // Método para crear un juego para una ronda específica del torneo
  // IMPORTANTE: Cada juego debe tener sus propios tiempos independientes
  createGameForMatch(matchId, gameSettings) {
    try {
      // Get match details
      const match = this.matches.get(matchId);
      if (!match) {
        throw new Error(`Match not found: ${matchId}`);
      }
      
      const tournamentId = match.tournamentId;
      const tournament = this.tournaments.get(tournamentId);
      
      // Identificar si es segunda semifinal basado en la posición del match en el array
      const isSecondSemifinal = match.round === 1 && 
        tournament && 
        tournament.matches.indexOf(matchId) === 1;
      
      // Merge settings with tournament round info
      const settings = {
        ...gameSettings,
        tournamentMode: true,
        tournamentRound: match.round,
        isSecondSemifinal: isSecondSemifinal
      };
      
      console.log(`Creating game for tournament match ${matchId} with settings:`, settings);
      console.log(`Match round: ${match.round}, isSecondSemifinal: ${isSecondSemifinal}`);
      
      // Create a new game with FRESH timers
      const gameId = this.gameManager.createGame(settings);
      
      // Update match with game ID
      match.gameId = gameId;
      console.log(`Game ${gameId} created for match ${matchId}`);
      
      // Add players to the game
      this.gameManager.addPlayer(gameId, match.player1, 1);
      this.gameManager.addPlayer(gameId, match.player2, 2);
      
      // CRÍTICO: Garantizar que este juego tenga un tiempo inicial independiente
      const gameEntry = this.gameManager.games.get(gameId);
      if (gameEntry) {
        // Reiniciar completamente todos los tiempos para esta partida
        const freshStartTime = Date.now();
        gameEntry.startTime = freshStartTime;
        gameEntry.finishTime = null;
        gameEntry.lastActivity = freshStartTime;
        
        // Reiniciar también los tiempos en el objeto PongGame
        const game = gameEntry.game;
        if (game) {
          game.lastUpdate = freshStartTime;
          game.gameCreatedAt = freshStartTime;
          game.gameStartedAt = null; // Se establecerá cuando inicie el juego
          game.totalPausedTime = 0;
          game.pauseIntervals = [];
          
          console.log(`Game ${gameId} initialized with fresh timestamps at ${new Date(freshStartTime).toISOString()}`);
          console.log(`Tournament round ${match.round}, ${isSecondSemifinal ? 'Second semifinal' : (match.round === 2 ? 'Final' : 'First semifinal')}`);
        }
      }
      
      return gameId;
    } catch (error) {
      console.error(`Error creating game for match: ${error.message}`);
      return null;
    }
  }
}

module.exports = new TournamentManager();