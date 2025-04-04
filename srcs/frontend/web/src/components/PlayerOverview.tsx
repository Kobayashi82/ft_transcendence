import React from "react";
import { User } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Types
interface PlayerStats {
  player_id: number;
  user_id: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_score: number;
  total_tournaments: number;
  tournament_wins: number;
}

interface PlayerOverviewProps {
  playerStats: PlayerStats;
}

const PlayerOverview: React.FC<PlayerOverviewProps> = ({ playerStats }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <User className="mr-2 h-6 w-6 text-blue-400" />
          {playerStats.user_id}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
		  <div className="bg-gray-700/40 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('rankings.gamesPlayed')}</p>
            <p className="text-2xl font-bold text-white">{playerStats.total_games ?? 0}</p>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('rankings.gamesWin')}</p>
            <p className="text-2xl font-bold text-white">{playerStats.wins ?? 0}</p>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('rankings.winRate')}</p>
            <p className="text-2xl font-bold text-white">{playerStats.win_rate.toFixed(1) ?? 0}%</p>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('rankings.tournaments')}</p>
            <p className="text-2xl font-bold text-white">{playerStats.total_tournaments ?? 0}</p>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('rankings.tournamentWins')}</p>
            <p className="text-2xl font-bold text-white">{playerStats.tournament_wins ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerOverview;