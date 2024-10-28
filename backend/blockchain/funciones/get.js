const TournamentScores = artifacts.require("TournamentScores");

module.exports = async function(callback) {
    try {
        const instance = await TournamentScores.deployed();

        const tournamentCount = await instance.getTournamentCount();
        console.log(`Número de torneos: ${tournamentCount}`);

        for (let i = 0; i < tournamentCount; i++) {
            const tournament = await instance.getTournament(i);
            const matchCount = await instance.getMatchCount(i);

			console.log(`Detalles del torneo ${i}:`);
            console.log(formatTournament(tournament));
			console.log(`Número de partidos en el torneo ${i}: ${matchCount}`);

            for (let j = 0; j < matchCount; j++) {
                const matchDetails = await instance.getMatch(i, j);

                console.log(`Detalles del partido ${j} en el torneo ${i}:`);
                console.log(formatMatch(matchDetails));
            }
        }

        callback();
    } catch (error) {
        console.error(error);
        callback(error);
    }
};

function formatTournament(tournament) {
    return {
        topPlayer1: tournament[0],
        topPlayer2: tournament[1],
        topPlayer3: tournament[2],
        finalized: tournament[3],
        startDate: formatTimestamp(tournament[4]),
        endDate: formatTimestamp(tournament[5])
    };
}

function formatMatch(matchDetails) {
    return {
        player1: matchDetails[0],
        player2: matchDetails[1],
        score1: matchDetails[2].toNumber(),
        score2: matchDetails[3].toNumber(),
        startDate: formatTimestamp(matchDetails[4]),
        endDate: formatTimestamp(matchDetails[5])
    };
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// truffle exec get.js