const TournamentScores = artifacts.require("TournamentScores");

module.exports = async function(callback) {
    try {
        const instance = await TournamentScores.deployed(); // Espera a que el contrato esté desplegado

        const tournamentCount = await instance.getTournamentCount();
        const lastTournamentIndex = tournamentCount.toNumber() - 1;

		if (lastTournamentIndex < 0) {
			console.log("No hay torneos abiertos.");
			return callback();
		}

		if (lastTournamentIndex >= 0) {	
			const tournament = await instance.getTournament(lastTournamentIndex);
			
			if (tournament[3]) {
				console.log(`No hay torneos abiertos.`);
				return callback();
			}
		}

        // Agregar partido entre Jugador 1 y Jugador 2
		await instance.addMatch(lastTournamentIndex, "Jugador 1", "Jugador 2", 10, 8, Math.floor(Date.now() / 1000));
		
        console.log(`Añadido un match al torneo ${lastTournamentIndex}.`);

        callback();
    } catch (error) {
        console.error("Error:", error);
        callback(error);
    }
};

// truffle exec match.js