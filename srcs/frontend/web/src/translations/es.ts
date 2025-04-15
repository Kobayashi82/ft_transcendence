const translations = {
  // Common
  'language': 'Idioma',
  'english': 'Inglés',
  'spanish': 'Español',
  'french': 'Francés',

  // Header
  'nav.quickMatch': 'Partida Rápida',
  'nav.tournament': 'Torneo',
  'nav.stats': 'Estadísticas',
  'nav.leaderboard': 'Tabla de Líderes',
  'nav.about': 'Acerca de',
  'nav.status': 'Estado del Servidor',

  // Home
  'home.title': 'Transcendence',
  'home.subtitle': 'La Experiencia de Juego Definitiva',
  'home.disclaimer': 'Bueno, quizás no "definitiva", pero definitivamente es una experiencia de juego.',
  'home.description': 'Desafía a oponentes, sube en la clasificación y demuestra que eres ligeramente mejor que tus rivales.',
  'home.playNow': 'Jugar Ahora',
  'home.choiceTitle': 'Haz Tu Elección',
  'home.choiceDescription': '¿Elegirás el camino a la gloria (o simplemente harás clic en algo al azar)? ¿Dominarás en Partida Rápida, te elevarás en el modo Torneo, o simplemente consultarás la Tabla de Líderes para ver lo malo que eres? La elección es tuya…',

  'gameMode.quickMatch.title': 'Partida Rápida',
  'gameMode.quickMatch.description': 'Desafía a otro jugador',
  'gameMode.tournament.title': 'Torneo',
  'gameMode.tournament.description': 'Participa en un torneo.',
  'gameMode.stats.title': 'Estadísticas',
  'gameMode.stats.description': 'Consulta las estadísticas de jugadores.',
  'gameMode.leaderboard.title': 'Tabla de Líderes',
  'gameMode.leaderboard.description': 'Consulta los mejores jugadores.',
  'gameMode.about.title': 'Acerca de',
  'gameMode.about.description': 'Aprende más sobre el proyecto.',
  'gameMode.status.title': 'Estado del Servidor',
  'gameMode.status.description': 'Consulta el estado del servidor.',

  // Quick Match
  'quickMatch.title': 'Partida Rápida',
  'quickMatch.subtitle': 'Desafía a otro jugador en un 1 contra 1',

  'quickMatch.settings': 'Configuración del Juego',
  'quickMatch.ballSpeed': 'Velocidad de la pelota',
  'quickMatch.paddleSize': 'Tamaño de la paleta',
  'quickMatch.winningScore': 'Puntos para ganar',
  'quickMatch.acceleration': 'Incremento de velocidad',
  'quickMatch.slow': 'Lento',
  'quickMatch.medium': 'Medio',
  'quickMatch.fast': 'Rápido',
  'quickMatch.short': 'Pequeño',
  'quickMatch.long': 'Grande',
  'quickMatch.points': 'puntos',
  'quickMatch.enabled': 'Activado',
  'quickMatch.disabled': 'Desactivado',
  'quickMatch.gameHelp': 'Configura los ajustes del juego arriba. La velocidad de la bola afecta cuán rápido se mueve, el tamaño de la paleta cambia la altura de tu paleta, y puedes establecer cuántos puntos se necesitan para ganar. Habilitar el incremento de velocidad hará que la bola se acelere después de cada golpe, haciendo el juego cada vez más desafiante.',
  
  'quickMatch.players': 'Jugadores',
  'quickMatch.player': 'Jugador',
  'quickMatch.selectPlayer': 'Selecciona o escribe un nombre',
  'quickMatch.aiOpponents': 'Oponentes IA',
  'quickMatch.humanPlayers': 'Jugadores',
  'quickMatch.playerHelp': 'Selecciona los participantes de la partida.',
  'quickMatch.playNow': 'Jugar Ahora',
  'quickMatch.error.duplicatePlayers': 'Cada jugador debe tener un nombre único',

  // Tournament
  'tournament.title': 'Torneo',
  'tournament.subtitle': 'Participa en un torneo con cuatro jugadores',

  'tournament.name': 'Nombre del torneo',
  'tournament.enterTournamentName': 'Introduce el nombre del torneo...',

  'tournament.settings': 'Configuración del Torneo',
  'tournament.ballSpeed': 'Velocidad de la pelota',
  'tournament.paddleSize': 'Tamaño de la paleta',
  'tournament.winningScore': 'Puntos para ganar',
  'tournament.acceleration': 'Incremento de velocidad',
  'tournament.slow': 'Lento',
  'tournament.medium': 'Medio',
  'tournament.fast': 'Rápido',
  'tournament.short': 'Pequeño',
  'tournament.long': 'Grande',
  'tournament.points': 'puntos',
  'tournament.enabled': 'Activado',
  'tournament.disabled': 'Desactivado',
  'tournament.gameHelp': 'Configura los ajustes del juego arriba. El torneo consta de dos partidas de semifinales seguidas de una final. Los ganadores de cada semifinal competirán en la final para determinar el campeón del torneo.',

  'tournament.players': 'Jugadores',
  'tournament.player': 'Jugador',
  'tournament.selectPlayer': 'Selecciona o escribe un nombre',
  'tournament.aiOpponents': 'Oponentes IA',
  'tournament.humanPlayers': 'Jugadores',
  'tournament.playerHelp': 'Selecciona los participantes del torneo.',
  'tournament.startTournament': 'Comenzar Torneo',
  'tournament.error.duplicatePlayers': 'Cada jugador debe tener un nombre único',
  'tournament.error.noAIAllowed': 'No se permite jugadores controlados por IA',

  // PongModal
  'quickMatch.startGame': 'Iniciar',
  'quickMatch.pause': 'Pausar',
  'quickMatch.resume': 'Continuar',
  'quickMatch.close': 'Cerrar',

  'quickMatch.waiting': 'Esperando jugadores',
  "quickMatch.waitingToStart": "Presione para iniciar",
  'quickMatch.paused': 'Juego pausado',
  "quickMatch.pressToResume": "Presiona para reanudar",
  'quickMatch.cancelled': 'Juego cancelado',
  'quickMatch.wins': '¡ha ganado!',
  'quickMatch.finalScore': 'Puntuación Final',

  'quickMatch.confirmCancel': '¿Cancelar Juego?',
  'quickMatch.confirmCancelText': 'Estás a punto de abandonar el juego. Esto cancelará la partida actual. ¿Estás seguro?',
  'tournament.confirmCancelText': 'Estás a punto de abandonar el torneo. Esto cancelará el torneo actual. ¿Estás seguro?',
  'quickMatch.stay': 'Quedarse',
  'quickMatch.leave': 'Salir y Cancelar',
  
  "quickMatch.connectionLostTitle": "Conexión perdida",
  "quickMatch.connectionLost": "Conexión perdida",
  "quickMatch.connectionLostMessage": "Se ha perdido la conexión con el servidor de juego. La partida ha sido cancelada.",
  "quickMatch.returnToMenu": "Volver",

  'tournament.firstSemifinalCompleted': 'Primera semifinal completada.',
  'tournament.secondSemifinalCompleted': 'Segunda semifinal completada.',
  'tournament.finalCompleted': '¡El torneo ha finalizado!',

  'tournament.proceedToSecondSemifinal': 'Ir a la segunda semifinal',
  'tournament.proceedToFinal': 'Ir a la final',
  'tournament.closeTournament': 'Volver',

  'tournament.winsSemifinal': '¡gana esta semifinal!',
  'tournament.winsTournament': '¡gana el torneo!',
  'tournament.score': 'Puntuación',

  // Stats
  'stats.title': 'Clasificación de Jugadores',
  'stats.subtitle': 'Consulta estadísticas detalladas de cualquier jugador',

  'stats.searchPlaceholder': 'Introduce el nombre de usuario',
  'stats.selectUser': 'Jugadores...',
  'stats.searchForPlayer': 'Busca a un Jugador',
  'stats.search': 'Buscar',
  'stats.enterUserIdToView': 'introduce un nombre de jugador para ver sus estadísticas',
  'stats.userNotFound': 'Jugador no encontrado',
  'stats.errorFetchingStats': 'Error al obtener estadísticas del jugador',
  'stats.unknownError': 'Ha ocurrido un error desconocido',
  
  'stats.gamesPlayed': 'Partidas Jugadas',
  'stats.gamesWin': 'Partidas Ganadas',
  'stats.winRate': 'Tasa de Victorias',
  'stats.tournaments': 'Torneos',
  'stats.tournamentWins': 'Torneos Ganados',
 
  'stats.recentGames': 'Partidas Recientes',
  'stats.date': 'Fecha',
  'stats.duration': 'Duración',
  'stats.opponent': 'Oponente',
  'stats.score': 'Puntuación',
  'stats.settings': 'Ajustes',
  'stats.noGamesFound': 'No se encontraron partidas',
  
  'stats.unknown': 'Desconocido',
  'stats.win': 'Victoria',
  'stats.loss': 'Derrota',
  'stats.draw': 'Empate',
  
  'stats.ballSpeed': 'Velocidad de la pelota',
  'stats.paddleSize': 'Tamaño de la paleta',
  'stats.speedIncrement': 'Incremento de velocidad',
  'stats.pointsToWin': 'Puntos para ganar',
  'stats.slow': 'Lento',
  'stats.medium': 'Medio',
  'stats.fast': 'Rápido',
  'stats.short': 'Pequeño',
  'stats.long': 'Grande',
  'stats.yes': 'Sí',
  'stats.no': 'No',
  'stats.noSettingsAvailable': 'No hay ajustes disponibles',

  'stats.tournamentName': 'Nombre',
  'stats.participants': 'Participantes',
  'stats.players': 'Jugadores',
  'stats.winner': 'Ganador',
  'stats.tournamentGames': 'Partidos del Torneo',
  'stats.round': 'Ronda',
  'stats.playerPosition': 'Posición',
  'stats.first': '1st Puesto',
  'stats.second': '2nd Puesto',
  'stats.third': '3rd Puesto',
  'stats.fourth': '4th Puesto',
  'stats.noTournamentsFound': 'No se encontraron torneos',
  'stats.noGamesInTournament': 'No se encontraron partidas en este torneo',

  // Leaderboard
  'leaderboard.title': 'Tabla de Líderes',
  'leaderboard.subtitle': 'Mira cómo se clasifican los jugadores en diferentes categorías',

  'leaderboard.mostWins': 'Más Victorias',
  'leaderboard.bestWinRate': 'Mejor Ratio',
  'leaderboard.tournamentWins': 'Torneos Ganados',
  'leaderboard.fastestWins': 'Victorias Rápidas',
  'leaderboard.mostGames': 'Más Partidas',

  'leaderboard.player': 'Jugador',
  'leaderboard.wins': 'Victorias',
  'leaderboard.winRate': 'Ratio de Victoria',
  'leaderboard.tournaments': 'Torneos',
  'leaderboard.time': 'Tiempo',
  'leaderboard.games': 'Partidas',
  'leaderboard.noData': 'No hay datos disponibles',
  'leaderboard.errorFetching': 'Error al obtener datos de la tabla de líderes',

  // About Us
  'about.title': 'El Equipo detrás de Transcendence',
  'about.subtitle': 'Conoce a los desarrolladores que, sin saber muy bien cómo, hicieron este proyecto',

  'about.projectTitle': 'Acerca de Transcendence',
  'about.projectDescription': 'Transcendence es un juego de Pong con torneos y clasificaciones ejecutado en un entorno containerizado con microservicios.',
  'about.projectJoke': '¿Qué sucede cuando hay friccion entre competidores y las bolas rebotan contra las paletas? Pues que empiezas a sudar de la emoción.',
  'about.techStack': 'Construido con:',

  'about.meetTeam': 'Conoce a Nuestro Equipo',
  'about.backToTeam': 'Volver al Equipo',

  'about.dev1.title': 'vzurera-',
  'about.dev1.bio': 'Empezó a programar en Basic con un Commodore 64. Desde entonces ha pasado por QBasic, Visual Basic, VB.NET, KerboScript (si, de Kerbal Space Program), C y C++. Su estilo de programación es caótico, experimental y altamente cutre. El código que escribe rara vez funciona a la primera, ni a la segunda, pero siempre deja huella… generalmente en forma de segfault.',
  'about.dev1.detail1': 'Se metió en el mundo de la programación por curiosidad, y desde entonces la informática intenta echarlo.',
  'about.dev1.detail2': 'Inventó una nueva metodología de desarrollo: Caos-Driven Development. Básicamente escribe sin pensar y arregla después... si le apetece.',
  'about.dev1.funFact': 'Una vez hizo un hello world que tardó 4 días en compilar… y aún así decía “Hell0 W0rld”.',

  'about.dev2.title': 'person 2',
  'about.dev2.bio': 'bio ...',
  'about.dev2.detail1': 'detail 1...',
  'about.dev2.detail2': 'detail 2...',
  'about.dev2.funFact': 'Dato curioso: ...',

  'about.dev3.title': 'person 3',
  'about.dev3.bio': 'bio ...',
  'about.dev3.detail1': 'detail 1...',
  'about.dev3.detail2': 'detail 2...',
  'about.dev3.funFact': 'Dato curioso: ...',

  'about.funFacts': 'Datos Curiosos',
  'about.funFact1': 'Este proyecto contiene aproximadamente 9.556 líneas de código, 127 tazas de café y 171 commits.',
  'about.funFact2': 'Se implementaron los módulos ELK, métricas y autenticación, pero luego se descartaron.',
  'about.funFact3': 'El proyecto se inició el 19 de marzo de 2025 y terminó en 15 de Abril de 2025 con una duración de 28 días.',

  // Status
  'status.title': 'Estado del Servidor',
  'status.subtitle': 'Monitoreo en tiempo real',

  'status.gateway': 'Gateway',
  'status.gatewayDescription': 'Servicio API Gateway',
  'status.uptime': 'Tiempo Activo',
  'status.status': 'Estado',
  'status.lastUpdated': 'Última Actualización',

  'status.microservices': 'Microservicios',
  'status.microservicesDescription': 'Estado de todos los servicios backend',
  'status.service': 'Servicio',
  'status.responseTime': 'Tiempo de Respuesta',

  'status.connectionError': 'Error de Conexión',
  'status.retry': 'Reintentar',
  'status.noServicesAvailable': 'No hay información de servicios disponible',

  'status.state.up': 'Activo',
  'status.state.down': 'Caído',
  'status.state.loading': 'Cargando',
  'status.state.warning': 'Advertencia',
  'status.state.degraded': 'Degradado',
  'status.state.critical': 'Crítico',
  'status.state.error': 'Error',
  'status.state.healthy': 'Saludable',

  // Not Found
  'notFound.title': '¡Página no encontrada',
  'notFound.message': 'Parece que esta página está fuera del campo de juego',
  'notFound.backToHome': 'Volver a la Página Principal',

}

export default translations;
