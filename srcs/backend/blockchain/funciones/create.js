const TournamentScores = artifacts.require("TournamentScores");

module.exports = async function(callback) {
    try {
        const instance = await TournamentScores.deployed();

		const tournamentCount = await instance.getTournamentCount();
		const lastTournamentIndex = tournamentCount.toNumber() - 1;

		if (lastTournamentIndex >= 0) {	
			const tournament = await instance.getTournament(lastTournamentIndex);
			
			if (!tournament[3]) {
				console.log(`Ya hay un torneo abierto.`);
				return callback();
			}
		}

		// Iniciar un nuevo torneo
		await instance.createTournament();

		console.log(`Torneo ${tournamentCount} iniciado.`);
	
        callback();
    } catch (error) {
        console.error("Error:", error);
        callback(error);
    }
};

// truffle exec create.js