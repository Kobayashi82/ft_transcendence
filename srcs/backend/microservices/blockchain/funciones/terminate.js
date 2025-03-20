const TournamentScores = artifacts.require("TournamentScores");

module.exports = async function(callback) {
    try {
        const instance = await TournamentScores.deployed();

		const tournamentCount = await instance.getTournamentCount();
        const lastTournamentIndex = tournamentCount.toNumber() - 1;

		if (lastTournamentIndex < 0) {
			console.log("No hay torneos disponibles para finalizar.");
			return callback();
		}
	
		const tournament = await instance.getTournament(lastTournamentIndex);

		if (tournament[3]) {
			console.log(`El torneo ${lastTournamentIndex} ya ha finalizado.`);
			return callback();
		}

        // Finaliza el torneo y define los ganadores
		await instance.finalizeTournament(lastTournamentIndex, "Jugador 1", "Jugador 3", "Jugador 2");

        console.log(`Torneo ${lastTournamentIndex} finalizado.`);
	
        callback();
    } catch (error) {
        console.error("Error:", error);
        callback(error);
    }
};

// truffle exec terminate.js