"use strict";

const { v4: uuidv4 } = require('uuid');

class TournamentManager {

  constructor() {
    this.tournaments = new Map();
    this.matches = new Map();
    this.tournamentSettings = new Map();
    this.gameManager = null;
  }
  
  setGameManager(gameManager) { this.gameManager = gameManager; } 
  setTournamentSettings(tournamentId, settings) { this.tournamentSettings.set(tournamentId, settings); }
  getTournamentSettings(tournamentId) { return this.tournamentSettings.get(tournamentId) || null; }
  
  // SHUFFLE PLAYERS
  shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
  
  // CREATE TOURNAMENT
  createTournament(players, settings, tournamentName) {
    if (players.length !== 4) throw new Error('Tournament requires exactly 4 players');

    const shuffledPlayers = this.shuffleArray(players);   
    const tournamentId = uuidv4();   
    const tournament = {
      id: tournamentId,
      name: tournamentName || `Tournament ${tournamentId.substring(0, 8)}`,
      tournamentName: tournamentName,
      createdAt: new Date(),
      settings: settings,
      players: shuffledPlayers,
      matches: []
    };

    // Create both semifinal
    const semifinal1Id = this.createMatch(tournamentId, 1, shuffledPlayers[0], shuffledPlayers[1]);
    const semifinal2Id = this.createMatch(tournamentId, 1, shuffledPlayers[2], shuffledPlayers[3]);

    // Create final with placeholder players
    const finalId = uuidv4();

    // Store match IDs in tournament
    tournament.matches.push(semifinal1Id);
    tournament.matches.push(semifinal2Id);
    tournament.matches.push(finalId);

    // Store info in matches
    this.matches.set(semifinal1Id, { tournamentId, round: 1, nextMatchId: finalId, player1Position: 1, player1: shuffledPlayers[0], player2: shuffledPlayers[1] });
    this.matches.set(semifinal2Id, { tournamentId, round: 1, nextMatchId: finalId, player1Position: 2, player1: shuffledPlayers[2], player2: shuffledPlayers[3] });
    this.matches.set(finalId, { tournamentId, round: 2, player1: null, player2: null, gameId: null });

    // Store tournament
    this.tournaments.set(tournamentId, tournament);
    if (this.gameManager && typeof this.gameManager.registerTournament === 'function') this.gameManager.registerTournament(tournamentId, tournament);

    return { tournamentId, tournamentName: tournament.name, firstMatchId: semifinal1Id, semifinal2Id: semifinal2Id, finalId: finalId, settings, players: shuffledPlayers };
  }
  
  // CREATE MATCH
  createMatch(tournamentId, round, player1, player2) {
    const matchId = uuidv4();
    this.matches.set(matchId, { tournamentId, round, player1, player2, gameId: null });
    
    return matchId;
  }
  
  // GET MATCH
  getMatchDetails(matchId) {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('Match not found');
    return match;
  }
  
  // UPDATE MATCH
  updateMatchGameId(matchId, gameId) {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('Match not found');
    match.gameId = gameId;
  }
  
  // GET TOURNAMENT
  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId);
  }
  
  // CANCEL TOURNAMENT
  cancelTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    
    // Cancel all active games
    for (const matchId of tournament.matches) {
      const match = this.matches.get(matchId);
      if (match && match.gameId) this.gameManager.cancelGame(match.gameId);
    }
    
    // Remove tournament
    this.tournaments.delete(tournamentId);
    this.tournamentSettings.delete(tournamentId);
    
    return true;
  }
  
  // NEXT MATCH
  advanceToNextRound(matchId, winnerId) {
    try {
      const match = this.matches.get(matchId);
      if (!match) throw new Error(`Match not found: ${matchId}`);
      if (!match.nextMatchId) return null;

      // Get next match
      const nextMatch = this.matches.get(match.nextMatchId);
      if (!nextMatch) throw new Error(`Next match not found: ${match.nextMatchId}`);

      // Update next match with this match's winner
      if (match.player1Position === 1)  nextMatch.player1 = winnerId;
      else                              nextMatch.player2 = winnerId;

      // Check if both players for next match are ready
      if (nextMatch.player1 && nextMatch.player2) return { matchId: match.nextMatchId, player1: nextMatch.player1, player2: nextMatch.player2, round: nextMatch.round };
      return null;
    } catch (error) { return null; }
  }
  
  // CREATE GAME FOR MATCH
  createGameForMatch(matchId, gameSettings) {
    try {
      const match = this.matches.get(matchId);
      if (!match) throw new Error(`Match not found: ${matchId}`);

      const tournamentId = match.tournamentId;
      const tournament = this.tournaments.get(tournamentId);
      const isSecondSemifinal = match.round === 1 && tournament && tournament.matches.indexOf(matchId) === 1;

      // Set settings
      let settings = gameSettings;
      const savedSettings = this.getTournamentSettings(tournamentId);

      if (savedSettings)  settings = { ...savedSettings, tournamentMode: true, tournamentRound: match.round, isSecondSemifinal: isSecondSemifinal };
      else                settings = { ...gameSettings, tournamentMode: true, tournamentRound: match.round, isSecondSemifinal: isSecondSemifinal };

      // Create a new game
      const gameId = this.gameManager.createGame(settings);

      // Update match with game ID
      match.gameId = gameId;

      // Add players to the game
      this.gameManager.addPlayer(gameId, match.player1, 1);
      this.gameManager.addPlayer(gameId, match.player2, 2);

      // Set times
      const gameEntry = this.gameManager.games.get(gameId);
      if (gameEntry) {
        const freshStartTime = Date.now();
        gameEntry.startTime = freshStartTime;
        gameEntry.finishTime = null;
        gameEntry.lastActivity = freshStartTime;
        const game = gameEntry.game;
        if (game) {
          game.lastUpdate = freshStartTime;
          game.gameCreatedAt = freshStartTime;
          game.gameStartedAt = null;
          game.totalPausedTime = 0;
          game.pauseIntervals = [];
        }
      }

      return gameId;
    } catch (error) { return null; }
  }

}

module.exports = new TournamentManager();
