const translations = {
  // Common
  'language': 'Langue',
  'english': 'Anglais',
  'spanish': 'Espagnol',
  'french': 'Français',

  // Header
  'nav.quickMatch': 'Match Rapide',
  'nav.tournament': 'Tournoi',
  'nav.stats': 'Statistiques',
  'nav.leaderboard': 'Classement',
  'nav.about': 'À Propos',
  'nav.status': 'État du Serveur',

  // Home
  'home.title': 'Transcendence',
  'home.subtitle': 'L\'Expérience de Jeu Ultime',
  'home.disclaimer': "Bon, peut-être pas \"ultime\", mais c'est définitivement une expérience de jeu.",
  'home.description': 'Défiez vos adversaires, grimpez dans les rangs et prouvez que vous êtes légèrement meilleur que vos rivaux.',
  'home.playNow': 'Jouer Maintenant',
  'home.choiceTitle': 'Faites Votre Choix',
  'home.choiceDescription': "Choisissez votre chemin vers la gloire (ou cliquez simplement au hasard). Allez-vous dominer en Match Rapide, vous élever en mode Tournoi, ou simplement consulter le Classement pour voir à quel point vous êtes mauvais ? Le choix vous appartient...",

  'gameMode.quickMatch.title': 'Match Rapide',
  'gameMode.quickMatch.description': 'Défier un autre joueur',
  'gameMode.tournament.title': 'Tournoi',
  'gameMode.tournament.description': 'Rejoindre un tournoi.',
  'gameMode.stats.title': 'Statistiques',
  'gameMode.stats.description': 'Voir les statistiques du joueur.',
  'gameMode.leaderboard.title': 'Classement',
  'gameMode.leaderboard.description': 'Voir les meilleurs joueurs.',
  'gameMode.about.title': 'À propos de nous',
  'gameMode.about.description': 'En savoir plus sur le projet.',
  'gameMode.status.title': 'État du Serveur',
  'gameMode.status.description': 'Vérifier l\'état du serveur.',

  // Quick Match
  'quickMatch.title': 'Match Rapide',
  'quickMatch.subtitle': 'Défiez un autre joueur dans un match 1 contre 1',

  'quickMatch.settings': 'Paramètres du Jeu',
  'quickMatch.ballSpeed': 'Vitesse de la Balle',
  'quickMatch.paddleSize': 'Taille de la Raquette',
  'quickMatch.winningScore': 'Points pour Gagner',
  'quickMatch.acceleration': 'Incrémentation de Vitesse',
  'quickMatch.slow': 'Lente',
  'quickMatch.medium': 'Moyenne',
  'quickMatch.fast': 'Rapide',
  'quickMatch.short': 'Courte',
  'quickMatch.long': 'Longue',
  'quickMatch.points': 'points',
  'quickMatch.enabled': 'Activée',
  'quickMatch.disabled': 'Désactivée',
  'quickMatch.gameHelp': 'Configurez vos paramètres de jeu ci-dessus. La vitesse de la balle affecte la rapidité de déplacement de la balle, la taille de la raquette modifie la hauteur de votre raquette, et vous pouvez définir combien de points sont nécessaires pour gagner. Activer l\'incrémentation de vitesse fera accélérer la balle après chaque frappe, rendant le jeu de plus en plus difficile.',
  
  'quickMatch.players': 'Joueurs',
  'quickMatch.player': 'Joueur',
  'quickMatch.selectPlayer': 'Sélectionnez ou tapez un nom',
  'quickMatch.aiOpponents': 'Adversaires IA',
  'quickMatch.humanPlayers': 'Joueurs',
  'quickMatch.playerHelp': 'Sélectionnez les joueurs pour le match.',
  'quickMatch.playNow': 'Jouer Maintenant',
  'quickMatch.error.duplicatePlayers': 'Chaque joueur doit avoir un nom unique',
  'tournament.error.noAIAllowed': 'Les joueurs contrôlés par l’IA ne sont pas autorisés',

  // Tournament
  'tournament.title': 'Tournoi',
  'tournament.subtitle': 'Rejoignez un tournoi avec quatre joueurs',

  'tournament.name': 'Nom du tournoi',
  'tournament.enterTournamentName': 'Entrez le nom du tournoi...',

  'tournament.settings': 'Paramètres du Tournoi',
  'tournament.ballSpeed': 'Vitesse de la Balle',
  'tournament.paddleSize': 'Taille de la Raquette',
  'tournament.winningScore': 'Points pour Gagner',
  'tournament.acceleration': 'Incrémentation de Vitesse',
  'tournament.slow': 'Lente',
  'tournament.medium': 'Moyenne',
  'tournament.fast': 'Rapide',
  'tournament.short': 'Courte',
  'tournament.long': 'Longue',
  'tournament.points': 'points',
  'tournament.enabled': 'Activée',
  'tournament.disabled': 'Désactivée',
  'tournament.gameHelp': 'Configurez les paramètres du jeu ci-dessus. Le tournoi consiste en deux demi-finales suivies d\'une finale. Les gagnants de chaque demi-finale s\'affronteront en finale pour déterminer le champion du tournoi.',

  'tournament.players': 'Joueurs',
  'tournament.player': 'Joueur',
  'tournament.selectPlayer': 'Sélectionnez ou tapez un nom',
  'tournament.aiOpponents': 'Adversaires IA',
  'tournament.humanPlayers': 'Joueurs',
  'tournament.playerHelp': 'Sélectionnez les joueurs pour le tournoi.',
  'tournament.startTournament': 'Démarrer le tournoi',
  'tournament.error.duplicatePlayers': 'Chaque joueur doit avoir un nom unique',

  // PongModal
  'quickMatch.startGame': 'Commencer',
  'quickMatch.pause': 'Pause',
  'quickMatch.resume': 'Reprendre',
  'quickMatch.close': 'Fermer',

  'quickMatch.waiting': 'En attente des joueurs...',
  "quickMatch.waitingToStart": "Appuyez pour Commencer",
  'quickMatch.paused': 'Jeu en pause',
  "quickMatch.pressToResume": "Appuyez pour Reprendre",
  'quickMatch.cancelled': 'Jeu annulé',
  'quickMatch.wins': 'gagne !',
  'quickMatch.finalScore': 'Score Final',

  'quickMatch.confirmCancel': 'Annuler la Partie ?',
  'quickMatch.confirmCancelText': 'Vous êtes sur le point de quitter le jeu. Cela annulera le match en cours. Êtes-vous sûr ?',
  'tournament.confirmCancelText': 'Vous êtes sur le point de quitter le tournoi. Cela annulera le tournoi en cours. Êtes-vous sûr ?',
  'quickMatch.stay': 'Rester',
  'quickMatch.leave': 'Quitter & Annuler',
  
  "quickMatch.connectionLostTitle": "Connexion Perdue",
  "quickMatch.connectionLost": "Connexion Perdue",
  "quickMatch.connectionLostMessage": "La connexion au serveur de jeu a été perdue. Le match a été annulé.",
  "quickMatch.returnToMenu": "Retourner au Menu",

  'tournament.firstSemifinalCompleted': 'Première demi-finale terminée.',
  'tournament.secondSemifinalCompleted': 'Deuxième demi-finale terminée.',
  'tournament.finalCompleted': 'Le tournoi est terminé',
  
  'tournament.proceedToSecondSemifinal': 'Passer à la seconde demi-finale',
  'tournament.proceedToFinal': 'Passer à la finale',
  'tournament.closeTournament': 'Fermer',

  'tournament.winsSemifinal': 'remporte cette demi-finale!',
  'tournament.winsTournament': 'remporte le tournoi!',
  'tournament.score': 'Score',

  // Stats
  'stats.title': 'Classement des Joueurs',
  'stats.subtitle': 'Suivez les performances et consultez les statistiques détaillées de n\'importe quel joueur',

  'stats.searchPlaceholder': 'Entrez un nom de joueur',
  'stats.selectUser': 'Joueurs...',
  'stats.searchForPlayer': 'Rechercher un Joueur',
  'stats.search': 'Rechercher',
  'stats.enterUserIdToView': 'Entrez un nom de joueur pour voir ses statistiques',
  'stats.userNotFound': 'Joueur non trouvé',
  'stats.errorFetchingStats': 'Erreur lors de la récupération des statistiques du joueur',
  'stats.unknownError': 'Une erreur inconnue s\'est produite',

  'stats.gamesPlayed': 'Parties Jouées',
  'stats.gamesWin': 'Parties Gagnées',
  'stats.winRate': 'Taux de Victoire',
  'stats.tournaments': 'Tournois',
  'stats.tournamentWins': 'Tournois Gagnés',

  'stats.recentGames': 'Parties Récentes',
  'stats.date': 'Date',
  'stats.duration': 'Durée',
  'stats.opponent': 'Adversaire',
  'stats.score': 'Score',
  'stats.settings': 'Paramètres',
  'stats.noGamesFound': 'Aucune partie trouvée',

  'stats.unknown': 'Inconnu',
  'stats.win': 'Victoire',
  'stats.loss': 'Défaite',
  'stats.draw': 'Match nul',

  'stats.ballSpeed': 'Vitesse de la Balle',
  'stats.paddleSize': 'Taille de la Raquette',
  'stats.speedIncrement': 'Incrémentation de Vitesse',
  'stats.pointsToWin': 'Points pour Gagner',
  'stats.slow': 'Lente',
  'stats.medium': 'Moyenne',
  'stats.fast': 'Rapide',
  'stats.short': 'Courte',
  'stats.long': 'Longue',
  'stats.yes': 'Oui',
  'stats.no': 'Non',
  'stats.noSettingsAvailable': 'Aucun paramètre disponible',

  'stats.tournamentName': 'Nom',
  'stats.participants': 'Participants',
  'stats.players': 'Joueurs',
  'stats.winner': 'Gagnant',
  'stats.tournamentGames': 'Parties du Tournoi',
  'stats.round': 'Tour',
  'stats.playerPosition': 'Position',
  'stats.first': '1ère Place',
  'stats.second': '2ème Place',
  'stats.third': '3ème Place',
  'stats.fourth': '4ème Place',
  'stats.noTournamentsFound': 'Aucun tournoi trouvé',
  'stats.noGamesInTournament': 'Aucune partie trouvée dans ce tournoi',

  // Leaderboard
  'leaderboard.title': 'Classement',
  'leaderboard.subtitle': 'Voyez comment les joueurs se classent dans différentes catégories',

  'leaderboard.mostWins': 'Plus de Victoires',
  'leaderboard.bestWinRate': 'Meilleur Taux de Victoire',
  'leaderboard.tournamentWins': 'Victoires en Tournoi',
  'leaderboard.fastestWins': 'Victoires les Plus Rapides',
  'leaderboard.mostGames': 'Plus de Parties',

  'leaderboard.player': 'Joueur',
  'leaderboard.wins': 'Victoires',
  'leaderboard.winRate': 'Taux de Victoire',
  'leaderboard.tournaments': 'Tournois',
  'leaderboard.time': 'Temps',
  'leaderboard.games': 'Parties',
  'leaderboard.noData': 'Aucune donnée disponible',
  'leaderboard.errorFetching': 'Erreur lors de la récupération des données de classement',

  // About Us
  'about.title': 'L\'Équipe Derrière Transcendence',
  'about.subtitle': 'Rencontrez les développeurs qui, sans vraiment savoir comment, ont fait exister ce projet',

  'about.projectTitle': 'À Propos de Transcendence',
  'about.projectDescription': 'Transcendence est un jeu de Pong avec des tournois et des classements, exécuté dans un environnement conteneurisé avec des microservices.',
  'about.projectJoke': 'Que se passe-t-il quand il y a de la friction entre les concurrents et que les balles rebondissent sur les raquettes ? Eh bien, vous commencez à transpirer d\'excitation.',
  'about.techStack': 'Construit avec :',

  'about.meetTeam': 'Rencontrez Notre Équipe',
  'about.backToTeam': 'Retour à l\'Équipe',

  'about.dev1.title': 'vzurera-',
  "about.dev1.bio": "Il a commencé à programmer en Basic avec un Commodore 64. Depuis, il est passé par QBasic, Visual Basic, VB.NET, KerboScript (oui, celui de Kerbal Space Program), C et C++. Son style de programmation est chaotique, expérimental et très bâclé. Le code qu'il écrit fonctionne rarement du premier coup, pas même du deuxième, mais il laisse toujours une trace… généralement sous forme de segfault.",
  "about.dev1.detail1": "Il s'est lancé dans la programmation par curiosité, et depuis, l'informatique essaie de l'éliminer.",
  "about.dev1.detail2": "Il a inventé une nouvelle méthodologie de développement : Caos-Driven Development. En gros, il écrit sans réfléchir et répare ensuite... s'il en a envie.",
  "about.dev1.funFact": "Il a une fois écrit un 'hello world' qui a pris 4 jours à compiler… et disait toujours 'Hell0 W0rld'.",

  'about.dev2.title': 'personne 1',
  'about.dev2.bio': 'bio ...',
  'about.dev2.detail1': 'détail 1...',
  'about.dev2.detail2': 'détail 2...',
  'about.dev2.funFact': 'Anecdote : ...',

  'about.dev3.title': 'personne 2',
  'about.dev3.bio': 'bio ...',
  'about.dev3.detail1': 'détail 1...',
  'about.dev3.detail2': 'détail 2...',
  'about.dev3.funFact': 'Anecdote : ...',

  'about.funFacts': 'Anecdotes Amusantes',
  'about.funFact1': 'Ce projet contient environ 9 556 lignes de code, 127 tasses de café et 135 commits.',
  'about.funFact2': 'Les modules ELK, métriques et authentification ont été implémentés puis abandonnés.',
  'about.funFact3': 'Le projet a commencé le 19 mars 2025 et s\'est terminé le 15 avril 2025, avec une durée de 28 jours.',

  // Status
  'status.title': 'État du Serveur',
  'status.subtitle': 'Surveillance en temps réel',

  'status.gateway': 'Passerelle',
  'status.gatewayDescription': 'Service de Passerelle API',
  'status.uptime': 'Temps de Fonctionnement',
  'status.status': 'État',
  'status.lastUpdated': 'Dernière Mise à Jour',

  'status.microservices': 'Microservices',
  'status.microservicesDescription': 'État de tous les services backend',
  'status.service': 'Service',
  'status.responseTime': 'Temps de Réponse',

  'status.connectionError': 'Erreur de Connexion',
  'status.retry': 'Réessayer',
  'status.noServicesAvailable': 'Aucune information sur les services disponible',

  'status.state.up': 'En ligne',
  'status.state.down': 'Hors ligne',
  'status.state.loading': 'Chargement',
  'status.state.warning': 'Avertissement',
  'status.state.degraded': 'Dégradé',
  'status.state.critical': 'Critique',
  'status.state.error': 'Erreur',
  'status.state.healthy': 'En bonne santé',

  // Not Found
  'notFound.title': 'Page non trouvée',
  'notFound.message': 'On dirait que cette page est hors du terrain de jeu',
  'notFound.backToHome': 'Retour à la Page d\'Accueil',

}

export default translations;
