"use strict";

const gameManager = require('./game-manager');
const { v4: uuidv4 } = require('uuid');

class TournamentManager {
  constructor() {
    this.tournaments = new Map();
    this.matches = new Map();
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
    
    // Store tournament
    this.tournaments.set(tournamentId, tournament);
    
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
  
  // CANCEL
  cancelTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    
    // Cancel all active games
    for (const matchId of tournament.matches) {
      const match = this.matches.get(matchId);
      if (match && match.gameId) {
        gameManager.cancelGame(match.gameId);
      }
    }
    
    // Remove tournament
    this.tournaments.delete(tournamentId);
    
    return true;
  }
}

module.exports = new TournamentManager();