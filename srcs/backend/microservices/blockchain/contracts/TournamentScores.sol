// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TournamentScores {
    struct Match {
        string player1; 
        string player2; 
        uint score1;
        uint score2;
        uint startDate; 
        uint endDate;  
    }

    struct Tournament {
        string topPlayer1; 
        string topPlayer2; 
        string topPlayer3; 
        bool finalized; 
        uint startDate; 
        uint endDate;   
        uint matchCount;
        mapping(uint => Match) matches;
    }

    Tournament[] public tournaments;

    event MatchAdded(string indexed player1, string indexed player2, uint score1, uint score2, uint startDate, uint endDate);
    event TournamentFinalized(uint tournamentId, string topPlayer1, string topPlayer2, string topPlayer3);

    function createTournament() public {
        Tournament storage newTournament = tournaments.push();
        newTournament.topPlayer1 = "";
        newTournament.topPlayer2 = "";
        newTournament.topPlayer3 = "";
        newTournament.finalized = false;
        newTournament.startDate = block.timestamp;
        newTournament.endDate = 0;
        newTournament.matchCount = 0;
    }

    function addMatch(uint _tournamentId, string memory _player1, string memory _player2, uint _score1, uint _score2, uint _startDate) public {
        require(!tournaments[_tournamentId].finalized, "El torneo ya ha sido finalizado.");
        
        Tournament storage tournament = tournaments[_tournamentId];
        uint matchId = tournament.matchCount++;
        
        Match storage newMatch = tournament.matches[matchId];
        newMatch.player1 = _player1;
        newMatch.player2 = _player2;
        newMatch.score1 = _score1;
        newMatch.score2 = _score2;
        newMatch.startDate = _startDate;
        newMatch.endDate = block.timestamp;

        emit MatchAdded(_player1, _player2, _score1, _score2, _startDate, newMatch.endDate);
    }

    function finalizeTournament(uint _tournamentId, string memory _topPlayer1, string memory _topPlayer2, string memory _topPlayer3) public {
        Tournament storage tournament = tournaments[_tournamentId];
        tournament.topPlayer1 = _topPlayer1;
        tournament.topPlayer2 = _topPlayer2;
        tournament.topPlayer3 = _topPlayer3;
        tournament.finalized = true;
        tournament.endDate = block.timestamp; 
        
        emit TournamentFinalized(_tournamentId, _topPlayer1, _topPlayer2, _topPlayer3);
    }

    function getTournament(uint _tournamentId) public view returns (string memory, string memory, string memory, bool, uint, uint) {
        Tournament storage tournament = tournaments[_tournamentId];
        return (tournament.topPlayer1, tournament.topPlayer2, tournament.topPlayer3, tournament.finalized, tournament.startDate, tournament.endDate);
    }

    function getMatchCount(uint _tournamentId) public view returns (uint) {
        Tournament storage tournament = tournaments[_tournamentId];
        return tournament.matchCount;
    }

    function getMatch(uint _tournamentId, uint _matchIndex) public view returns (string memory, string memory, uint, uint, uint, uint) {
        Tournament storage tournament = tournaments[_tournamentId];
        require(_matchIndex < tournament.matchCount, "Indice fuera de rango");
        Match storage matchDetails = tournament.matches[_matchIndex];
        return (matchDetails.player1, matchDetails.player2, matchDetails.score1, matchDetails.score2, matchDetails.startDate, matchDetails.endDate);
    }

	
    function getTournamentCount() public view returns (uint) {
        return tournaments.length;
    }
}