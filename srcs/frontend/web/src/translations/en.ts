const translations = {
  // Common
  'language': 'Language',
  'english': 'English',
  'spanish': 'Spanish',
  'french': 'French',

  // Header
  'nav.quickMatch': 'Quick Match',
  'nav.tournament': 'Tournament',
  'nav.stats': 'Stats',
  'nav.leaderboard': 'Leaderboard',
  'nav.about': 'About Us',
  'nav.status': 'Server Status',

  // Home
  'home.title': 'Transcendence',
  'home.subtitle': 'The Ultimate Gaming Experience',
  'home.disclaimer': "Okay, maybe not \"ultimate,\" but it's definitely a gaming experience.",
  'home.description': 'Challenge opponents, climb the ranks, and prove you’re slightly better than your rivals.',
  'home.playNow': 'Play Now',
  'home.choiceTitle': 'Make Your Choice',
  'home.choiceDescription': "Choose your path to glory (or just click something randomly). Will you dominate in Quick Match, rise in Tournament mode, or just check the Leaderboard to see how bad you are? The choice is yours…",

  'gameMode.quickMatch.title': 'Quick Match',
  'gameMode.quickMatch.description': 'Challenge another player',
  'gameMode.tournament.title': 'Tournament',
  'gameMode.tournament.description': 'Join a tournament.',
  'gameMode.stats.title': 'Stats',
  'gameMode.stats.description': 'View the player\'s stats.',
  'gameMode.leaderboard.title': 'Leaderboard',
  'gameMode.leaderboard.description': 'View the top players.',
  'gameMode.about.title': 'About us',
  'gameMode.about.description': 'Learn more about the project.',
  'gameMode.status.title': 'Server Status',
  'gameMode.status.description': 'Check the server status.',

  // Quick Match
  'quickMatch.title': 'Quick Match',
  'quickMatch.subtitle': 'Challenge another player in a 1 versus 1 match',

  'quickMatch.settings': 'Game Settings',
  'quickMatch.ballSpeed': 'Ball Speed',
  'quickMatch.paddleSize': 'Paddle Size',
  'quickMatch.winningScore': 'Points to Win',
  'quickMatch.acceleration': 'Speed Increment',
  'quickMatch.slow': 'Slow',
  'quickMatch.medium': 'Medium',
  'quickMatch.fast': 'Fast',
  'quickMatch.short': 'Short',
  'quickMatch.long': 'Long',
  'quickMatch.points': 'points',
  'quickMatch.enabled': 'Enabled',
  'quickMatch.disabled': 'Disabled',
  'quickMatch.gameHelp': 'Configure your game settings above. The ball speed affects how fast the ball moves, paddle size changes the height of your paddle, and you can set how many points are needed to win. Enabling speed increment will make the ball speed up after each hit, making the game increasingly challenging.',
  
  'quickMatch.players': 'Players',
  'quickMatch.player': 'Player',
  'quickMatch.selectPlayer': 'Select or type a player name',
  'quickMatch.aiOpponents': 'AI Opponents',
  'quickMatch.humanPlayers': 'Players',
  'quickMatch.playerHelp': 'Select the players for the match.',
  'quickMatch.playNow': 'Play Now',

  // Tournament
  'tournament.title': 'Tournament',
  'tournament.subtitle': 'Join a tournament with four players',

  'tournament.settings': 'Tournament Settings',
  'tournament.ballSpeed': 'Ball Speed',
  'tournament.paddleSize': 'Paddle Size',
  'tournament.winningScore': 'Points to Win',
  'tournament.acceleration': 'Speed Increment',
  'tournament.slow': 'Slow',
  'tournament.medium': 'Medium',
  'tournament.fast': 'Fast',
  'tournament.short': 'Short',
  'tournament.long': 'Long',
  'tournament.points': 'points',
  'tournament.enabled': 'Enabled',
  'tournament.disabled': 'Disabled',
  'tournament.gameHelp': 'Configure the game settings above. The tournament consists of two semifinal matches followed by a final. Winners from each semifinal will compete in the final to determine the champion of the tournament.',

  'tournament.players': 'Players',
  'tournament.player': 'Player',
  'tournament.selectPlayer': 'Select or type a player name',
  'tournament.aiOpponents': 'AI Opponents',
  'tournament.humanPlayers': 'Players',
  'tournament.playerHelp': 'Select the players for the tournament.',
  'tournament.playNow': 'Play Now',

  // PongModal
  'quickMatch.startGame': 'Start',
  'quickMatch.pause': 'Pause',
  'quickMatch.resume': 'Resume',
  'quickMatch.close': 'Close',

  'quickMatch.waiting': 'Waiting for players...',
  "quickMatch.waitingToStart": "Press to Start",
  'quickMatch.paused': 'Game paused',
  "quickMatch.pressToResume": "Press to Resume",
  'quickMatch.cancelled': 'Game cancelled',
  'quickMatch.wins': 'wins!',
  'quickMatch.finalScore': 'Final Score',

  'quickMatch.confirmCancel': 'Cancel Game?',
  'quickMatch.confirmCancelText': 'You are about to leave the game. This will cancel the current match. Are you sure?',
  'tournament.confirmCancelText': 'You are about to leave the tournament. This will cancel the current tournament. Are you sure?',
  'quickMatch.stay': 'Stay',
  'quickMatch.leave': 'Leave & Cancel',
  
  "quickMatch.connectionLostTitle": "Connection Lost",
  "quickMatch.connectionLost": "Connection Lost",
  "quickMatch.connectionLostMessage": "The connection to the game server was lost. The match has been cancelled.",
  "quickMatch.returnToMenu": "Return to Menu",

  'tournament.firstSemifinalCompleted': 'First semifinal completed.',
  'tournament.secondSemifinalCompleted': 'Second semifinal completed.',
  'tournament.finalCompleted': 'The tournament is over',
  
  'tournament.proceedToSecondSemifinal': 'Proceed to second semifinal',
  'tournament.proceedToFinal': 'Proceed to final',
  'tournament.closeTournament': 'Close',
  
  // Stats
  'stats.title': 'Player Rankings',
  'stats.subtitle': 'Track performance and view detailed stats for any player',

  'stats.searchPlaceholder': 'Enter a player name',
  'stats.selectUser': 'Players...',
  'stats.searchForPlayer': 'Search for a Player',
  'stats.search': 'Search',
  'stats.enterUserIdToView': 'Enter a player name to view their statistics',
  'stats.userNotFound': 'Player not found',
  'stats.errorFetchingStats': 'Error fetching player statistics',
  'stats.unknownError': 'An unknown error occurred',

  'stats.gamesPlayed': 'Games Played',
  'stats.gamesWin': 'Games Won',
  'stats.winRate': 'Win Rate',
  'stats.tournaments': 'Tournaments',
  'stats.tournamentWins': 'Tournament Wins',

  'stats.recentGames': 'Recent Games',
  'stats.date': 'Date',
  'stats.duration': 'Duration',
  'stats.opponent': 'Opponent',
  'stats.score': 'Score',
  'stats.settings': 'Settings',
  'stats.noGamesFound': 'No games found',

  'stats.unknown': 'Unknown',
  'stats.win': 'Win',
  'stats.loss': 'Loss',
  'stats.draw': 'Draw',

  'stats.ballSpeed': 'Ball Speed',
  'stats.paddleSize': 'Paddle Size',
  'stats.speedIncrement': 'Speed Increment',
  'stats.pointsToWin': 'Points to Win',
  'stats.slow': 'Slow',
  'stats.medium': 'Medium',
  'stats.fast': 'Fast',
  'stats.short': 'Short',
  'stats.long': 'Long',
  'stats.yes': 'Yes',
  'stats.no': 'No',
  'stats.noSettingsAvailable': 'No settings available',

  'stats.tournamentName': 'Name',
  'stats.participants': 'Participants',
  'stats.players': 'Players',
  'stats.winner': 'Winner',
  'stats.tournamentGames': 'Tournament Games',
  'stats.round': 'Round',
  'stats.playerPosition': 'Position',
  'stats.first': '1st Place',
  'stats.second': '2nd Place',
  'stats.third': '3rd Place',
  'stats.fourth': '4th Place',
  'stats.noTournamentsFound': 'No tournaments found',
  'stats.noGamesInTournament': 'No games found in this tournament',

  // Leaderboard
  'leaderboard.title': 'Leaderboard',
  'leaderboard.subtitle': 'See how players rank across different categories',

  'leaderboard.mostWins': 'Most Wins',
  'leaderboard.bestWinRate': 'Best Win Rate',
  'leaderboard.tournamentWins': 'Tournament Wins',
  'leaderboard.fastestWins': 'Fastest Wins',
  'leaderboard.mostGames': 'Most Games',

  'leaderboard.player': 'Player',
  'leaderboard.wins': 'Wins',
  'leaderboard.winRate': 'Win Rate',
  'leaderboard.tournaments': 'Tournaments',
  'leaderboard.time': 'Time',
  'leaderboard.games': 'Games',
  'leaderboard.noData': 'No data available',
  'leaderboard.errorFetching': 'Error fetching leaderboard data',

  // About Us
  'about.title': 'The Team Behind Transcendence',
  'about.subtitle': 'Meet the slightly obsessive, definitely caffeinated developers who brought this game to life',

  'about.projectTitle': 'About Transcendence',
  'about.projectDescription': 'Transcendence is a Pong game with tournaments and rankings, executed in a containerized environment with microservices.',
  'about.projectJoke': 'What happens when there is friction between competitors and the balls bounce off the paddles? Well, you start sweating from the excitement.',
  'about.techStack': 'Built with:',

  'about.meetTeam': 'Meet Our Team',
  'about.backToTeam': 'Back to Team',

  'about.dev1.title': 'vzurera-',
  'about.dev1.bio': 'bio ...',
  'about.dev1.detail1': 'detail 1...',
  'about.dev1.detail2': 'detail 2...',
  'about.dev1.funFact': 'Fun fact: ...',

  'about.dev2.title': 'person 1',
  'about.dev2.bio': 'bio ...',
  'about.dev2.detail1': 'detail 1...',
  'about.dev2.detail2': 'detail 2...',
  'about.dev2.funFact': 'Fun fact: ...',

  'about.dev3.title': 'person 2',
  'about.dev3.bio': 'bio ...',
  'about.dev3.detail1': 'detail 1...',
  'about.dev3.detail2': 'detail 2...',
  'about.dev3.funFact': 'Fun fact: ...',

  'about.funFacts': 'Fun Facts',
  'about.funFact1': 'This project contains approximately 5,767 lines of code, 127 cups of coffee, and 102 commits.',
  'about.funFact2': 'The ELK, metrics, and authentication modules were implemented and then discarded.',
  'about.funFact3': 'The project started in November 2024 and ended in April 2025, lasting for 5 months.',

  // Status
  'status.title': 'Server Status',
  'status.subtitle': 'Real-time monitoring',

  'status.gateway': 'Gateway',
  'status.gatewayDescription': 'API Gateway Service',
  'status.uptime': 'Uptime',
  'status.status': 'Status',
  'status.lastUpdated': 'Last Updated',

  'status.microservices': 'Microservices',
  'status.microservicesDescription': 'Status of all backend services',
  'status.service': 'Service',
  'status.responseTime': 'Response Time',

  'status.connectionError': 'Connection Error',
  'status.retry': 'Retry',
  'status.noServicesAvailable': 'No services information available',

  'status.state.up': 'Up',
  'status.state.down': 'Down',
  'status.state.loading': 'Loading',
  'status.state.warning': 'Warning',
  'status.state.degraded': 'Degraded',
  'status.state.critical': 'Critical',
  'status.state.error': 'Error',
  'status.state.healthy': 'Healthy',

  // Not Found
  'notFound.title': 'Page not found',
  'notFound.message': 'Looks like this page is out of the playing field',
  'notFound.backToHome': 'Back to Home Page',

};

export default translations;