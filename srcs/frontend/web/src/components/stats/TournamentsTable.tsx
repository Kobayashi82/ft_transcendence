import React from "react";
import { Trophy, ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import GameSetting from "./GameSetting";

// Types
interface TournamentDetails {
  id: number;
  name: string;
  start_time: string;
  end_time: string | null;
  settings: {
    ballSpeed?: string;
    paddleSize?: string;
    speedIncrement?: boolean;
    pointsToWin?: number;
    format?: string;
    [key: string]: any;
  };
  status: string;
  players: {
    id: number;
    user_id: string;
    final_position: number | null;
  }[];
  games: GameDetails[];
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

// Extended tournament interface with expanded state
interface TournamentWithExpand extends TournamentDetails {
  isExpanded: boolean;
}

interface TournamentsTableProps {
  tournaments: TournamentWithExpand[];
  userId: string;
  onToggleExpand: (tournamentId: number) => void;
}

const TournamentsTable: React.FC<TournamentsTableProps> = ({ tournaments, userId, onToggleExpand }) => {
  const { t } = useLanguage();

  // Format date to local string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Calculate game duration in mm:ss format
  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = Math.max(0, endTime - startTime); // Evitar duraciones negativas
    
    // Calculate minutes and seconds
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Format as mm:ss
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get position text
  const getPositionText = (position: number | null) => {
    if (!position) return t('stats.unknown');
    
    switch (position) {
      case 1: return t('stats.first');
      case 2: return t('stats.second');
      case 3: return t('stats.third');
      case 4: return t('stats.third');
      default: return position.toString();
    }
  };

  // Get winner of tournament
  const getTournamentWinner = (tournament: TournamentDetails) => {
    const winner = tournament.players.find(player => player.final_position === 1);
    return winner ? winner.user_id : t('stats.unknown');
  };

  // Format participants list
  const formatParticipants = (players: { user_id: string }[]) => {
    return players.map(player => player.user_id).join(", ");
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600"></div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-amber-400" />
          {t('stats.tournaments')}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 px-4 text-gray-400 font-medium" style={{ width: '40px' }}></th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.tournamentName')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.date')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.participants')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.winner')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.playerPosition')}
                </th>
                <th className="pb-3 px-4 text-gray-400 font-medium">
                  {t('stats.settings')}
                </th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(tournament => (
                <React.Fragment key={tournament.id}>
                  {/* Tournament row */}
                  <tr className="hover:bg-gray-700/30 cursor-pointer border-b border-gray-700/50" onClick={() => onToggleExpand(tournament.id)}>
                    <td className="py-4 px-4 text-gray-300">
                      <button className="p-1 hover:bg-gray-600 rounded-full transition-colors">
                        {tournament.isExpanded ? 
                          <ChevronDown className="h-5 w-5 text-blue-400" /> : 
                          <ChevronRight className="h-5 w-5 text-gray-400" />}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-white font-medium">
                      {tournament.name}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {formatDate(tournament.start_time)}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {formatParticipants(tournament.players)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-amber-400">
                        {getTournamentWinner(tournament)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {getPositionText(tournament.players.find(p => p.user_id === userId)?.final_position || null)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {tournament.settings.ballSpeed && (
                          <GameSetting type="ballSpeed" value={tournament.settings.ballSpeed} />
                        )}
                        {tournament.settings.paddleSize && (
                          <GameSetting type="paddleSize" value={tournament.settings.paddleSize} />
                        )}
                        {tournament.settings.speedIncrement !== undefined && (
                          <GameSetting type="speedIncrement" value={tournament.settings.speedIncrement} />
                        )}
                        {tournament.settings.pointsToWin && (
                          <GameSetting type="pointsToWin" value={tournament.settings.pointsToWin} />
                        )}
                        {!tournament.settings.ballSpeed && !tournament.settings.paddleSize && 
                         tournament.settings.speedIncrement === undefined && !tournament.settings.pointsToWin && (
                          <span className="text-gray-400 text-sm">{t('stats.noSettingsAvailable')}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded tournament games */}
                  {tournament.isExpanded && (
                    <tr>
                      <td colSpan={7} className="py-0 px-0">
                        <div className="bg-gray-700/30 p-4">
                          <h4 className="text-white font-medium mb-3 pl-8">
                            {t('stats.tournamentGames')}
                          </h4>
                          <div className="overflow-x-auto pl-8 pr-4">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="text-left border-b border-gray-600">
                                  <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                    {t('stats.round')}
                                  </th>
                                  <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                    {t('stats.players')}
                                  </th>
                                  <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                    {t('stats.score')}
                                  </th>
                                  <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                    {t('stats.duration')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-600/50">
                                {tournament.games.map((game, index) => (
                                  <tr key={game.id} className="hover:bg-gray-600/30">
                                    <td className="py-3 px-4 text-gray-300">
                                      {t('stats.round')} {index + 1}
                                    </td>
                                    <td className="py-3 px-4 text-gray-300">
                                      {game.players.map(p => p.user_id).join(" 🆚 ")}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center">
                                        <span className={`font-bold ${game.players[0].user_id === userId ? 'text-blue-400' : 'text-gray-300'}`}>
                                          {game.players[0].score}
                                        </span>
                                        <span className="mx-2 text-gray-500">-</span>
                                        <span className={`font-bold ${game.players[1]?.user_id === userId ? 'text-blue-400' : 'text-gray-300'}`}>
                                          {game.players[1]?.score || 0}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-300">
                                      {calculateDuration(game.start_time, game.end_time)}
                                    </td>
                                  </tr>
                                ))}
                                
                                {tournament.games.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-gray-400">
                                      {t('stats.noGamesInTournament')}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    {t('stats.noTournamentsFound')}
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

export default TournamentsTable;