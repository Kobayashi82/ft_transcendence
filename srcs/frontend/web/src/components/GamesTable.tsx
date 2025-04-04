import React from "react";
import { Calendar, Settings } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Types
interface RecentGame {
  id: number;
  start_time: string;
  end_time: string;
  score: number;
}

interface GameDetails {
  id: number;
  tournament_id: number | null;
  start_time: string;
  end_time: string;
  settings: {
    ballSpeed: number;
    paddleSize: number;
    speedIncrement: number;
    pointsToWin: number;
    [key: string]: any;
  };
  players: {
    id: number;
    user_id: string;
    score: number;
  }[];
}

interface GamesTableProps {
  games: RecentGame[];
  gameDetails: Record<number, GameDetails>;
  userId: string;
}

const GamesTable: React.FC<GamesTableProps> = ({ games, gameDetails, userId }) => {
  const { t } = useLanguage();

  // Format date to local string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Calculate game duration in minutes
  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    const minutes = Math.round(durationMs / (1000 * 60));
    return `${minutes} ${t('rankings.minutes')}`;
  };

  // Get opponent for a game
  const getOpponent = (game: GameDetails, playerUserId: string) => {
    const opponent = game.players.find(player => player.user_id !== playerUserId);
    return opponent ? opponent.user_id : t('rankings.unknown');
  };
  
  // Get game result text (win or loss)
  const getGameResult = (game: GameDetails, playerUserId: string) => {
    const player = game.players.find(p => p.user_id === playerUserId);
    const opponent = game.players.find(p => p.user_id !== playerUserId);
    
    if (!player || !opponent) return '';
    
    if (player.score > opponent.score) {
      return `${t('rankings.win')}`;
    } else if (player.score < opponent.score) {
      return `${t('rankings.loss')}`;
    } else {
      return `${t('rankings.draw')}`;
    }
  };

  // Get player score for a game
  const getPlayerScore = (game: GameDetails, playerUserId: string) => {
    const playerInGame = game.players.find(player => player.user_id === playerUserId);
    return playerInGame ? playerInGame.score : 0;
  };

  // Get opponent score for a game
  const getOpponentScore = (game: GameDetails, playerUserId: string) => {
    const opponent = game.players.find(player => player.user_id !== playerUserId);
    return opponent ? opponent.score : 0;
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-600"></div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('rankings.recentGames')}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('rankings.date')}
                  </div>
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('rankings.duration')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('rankings.opponent')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('rankings.score')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('rankings.settings')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {games.map(game => {
                const details = gameDetails[game.id];
                
                return (
                  <tr key={game.id} className="hover:bg-gray-700/30">
                    <td className="py-4 px-4 text-gray-300">
                      {formatDate(game.start_time)}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {details ? calculateDuration(details.start_time, details.end_time) : "-"}
                    </td>
                    <td className="py-4 px-4 text-white font-medium">
                      {details ? getOpponent(details, userId) : "-"}
                    </td>
                    <td className="py-4 px-4">
                      {details ? (
                        <div className="flex items-center">
                          <span className="font-bold text-blue-400">
                            {getPlayerScore(details, userId)}
                          </span>
                          <span className="mx-2 text-gray-500">-</span>
                          <span className="font-bold text-red-400">
                            {getOpponentScore(details, userId)}
                          </span>
                          <span className="ml-3 px-2 py-1 text-xs rounded-full bg-opacity-20 font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: getGameResult(details, userId).includes(t('rankings.win')) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: getGameResult(details, userId).includes(t('rankings.win')) ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                            }}
                          >
                            {getGameResult(details, userId)}
                          </span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {details && details.settings ? (
                        <div className="text-sm">
                          <p>{t('rankings.ballSpeed')}: {details.settings.ballSpeed || "-"}</p>
                          <p>{t('rankings.paddleSize')}: {details.settings.paddleSize || "-"}</p>
                          <p>{t('rankings.speedIncrement')}: {details.settings.speedIncrement || "-"}</p>
                          <p>{t('rankings.pointsToWin')}: {details.settings.pointsToWin || "-"}</p>
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
              
              {games.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    {t('rankings.noGamesFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GamesTable;