import React from "react";
import { Calendar, Settings } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import GameSetting from "./GameSetting";

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
    ballSpeed: number | string;
    paddleSize: number | string;
    speedIncrement: number | boolean;
    pointsToWin: number;
    [key: string]: any;
  }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = Math.max(0, endTime - startTime);
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const getOpponent = (game: GameDetails, playerUserId: string) => {
    const opponent = game.players.find(player => player.user_id !== playerUserId);
    return opponent ? opponent.user_id : t('stats.unknown');
  }

  const getGameResult = (game: GameDetails, playerUserId: string) => {
    const player = game.players.find(p => p.user_id === playerUserId);
    const opponent = game.players.find(p => p.user_id !== playerUserId);

    if (!player || !opponent) return '';

    if (player.score > opponent.score) {
      return `${t('stats.win')}`;
    } else if (player.score < opponent.score) {
      return `${t('stats.loss')}`;
    } else {
      return `${t('stats.draw')}`;
    }
  }

  const getPlayerScore = (game: GameDetails, playerUserId: string) => {
    const playerInGame = game.players.find(player => player.user_id === playerUserId);
    return playerInGame ? playerInGame.score : 0;
  }

  const getOpponentScore = (game: GameDetails, playerUserId: string) => {
    const opponent = game.players.find(player => player.user_id !== playerUserId);
    return opponent ? opponent.score : 0;
  }

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-600"></div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('stats.recentGames')}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('stats.date')}
                  </div>
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium text-center">
                  {t('stats.duration')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium text-center">
                  {t('stats.opponent')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium text-center">
                  {t('stats.score')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium text-center">
                  <div className="flex items-center justify-center">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('stats.settings')}
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
                    <td className="py-4 px-4 text-gray-300 text-center">
                      {details ? calculateDuration(details.start_time, details.end_time) : "-"}
                    </td>
                    <td className="py-4 px-4 text-white font-medium text-center">
                      {details ? getOpponent(details, userId) : "-"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {details ? (
                        <div className="flex items-center justify-center">
                          <span className="font-bold text-blue-400">
                            {getPlayerScore(details, userId)}
                          </span>
                          <span className="mx-2 text-gray-500">-</span>
                          <span className="font-bold text-red-400">
                            {getOpponentScore(details, userId)}
                          </span>
                          <span className="ml-3 px-2 py-1 text-xs rounded-full bg-opacity-20 font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: getGameResult(details, userId).includes(t('stats.win')) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: getGameResult(details, userId).includes(t('stats.win')) ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                            }}
                          >
                            {getGameResult(details, userId)}
                          </span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {details && details.settings ? (
                        <div className="flex items-center gap-3 justify-center">
                          {details.settings.ballSpeed && (
                            <GameSetting type="ballSpeed" value={details.settings.ballSpeed} />
                          )}
                          {details.settings.paddleSize && (
                            <GameSetting type="paddleSize" value={details.settings.paddleSize} />
                          )}
                          {details.settings.speedIncrement !== undefined && (
                            <GameSetting type="speedIncrement" value={details.settings.speedIncrement} />
                          )}
                          {details.settings.pointsToWin && (
                            <GameSetting type="pointsToWin" value={details.settings.pointsToWin} />
                          )}
                          {!details.settings.ballSpeed && !details.settings.paddleSize && 
                           details.settings.speedIncrement === undefined && !details.settings.pointsToWin && (
                            <span className="text-gray-400 text-sm">{t('stats.noSettingsAvailable')}</span>
                          )}
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}

              {games.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    {t('stats.noGamesFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GamesTable;
