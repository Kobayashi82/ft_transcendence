import React from "react";
import { Link } from "react-router-dom";

const GameResults: React.FC = () => {
  const mockResults = [
    {
      id: 1,
      opponent: "Player123",
      result: "Win",
      score: "10-5",
      date: "2023-09-10",
    },
    {
      id: 2,
      opponent: "GameMaster",
      result: "Loss",
      score: "4-10",
      date: "2023-09-09",
    },
    {
      id: 3,
      opponent: "ChampionX",
      result: "Win",
      score: "10-8",
      date: "2023-09-08",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="container-custom py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Game Results</h1>
          <Link to="/game" className="btn-secondary">
            Back to Game
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Recent Game History
          </h2>

          {mockResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Opponent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {mockResults.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        {game.opponent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            game.result === "Win"
                              ? "bg-green-900 text-green-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {game.result}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-mono">
                        {game.score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {game.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              No game results found.
            </p>
          )}

          <div className="mt-8">
            <Link to="/game" className="btn-primary">
              Play Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResults;
