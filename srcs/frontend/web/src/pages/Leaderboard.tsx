import React, { useState, useEffect } from "react";
import { Trophy, Award, Zap, BarChart3, Users, Medal } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

// Types for API responses
interface LeaderboardEntry {
  player_id: number;
  user_id: string;
  wins?: number;
  total_games?: number;
  win_rate?: number;
  tournament_wins?: number;
  total_tournaments?: number;
  fastest_win?: number; // Duration in seconds
}

type LeaderboardCategory = 'wins' | 'winrate' | 'tournaments' | 'fastest' | 'totalGames';

const LeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('wins');
  const [leaderboards, setLeaderboards] = useState<Record<LeaderboardCategory, LeaderboardEntry[]>>({
    wins: [],
    winrate: [],
    tournaments: [],
    fastest: [],
    totalGames: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboards data
  useEffect(() => {
    const fetchLeaderboards = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch most wins leaderboard
        const winsResponse = await fetch('/api/stats/stats/leaderboard/wins?limit=10');
        let winsData: { data: LeaderboardEntry[] } = { data: [] };
        
        if (winsResponse.ok) {
          winsData = await winsResponse.json();
        } else {
          console.error('Failed to fetch wins leaderboard:', winsResponse.status);
        }
        
        // Fetch win rate leaderboard
        const winRateResponse = await fetch('/api/stats/stats/leaderboard/winrate?limit=10&min_games=5');
        let winRateData: { data: LeaderboardEntry[] } = { data: [] };
        
        if (winRateResponse.ok) {
          winRateData = await winRateResponse.json();
        } else {
          console.error('Failed to fetch win rate leaderboard:', winRateResponse.status);
        }
        
        // Fetch tournament wins leaderboard
        const tournamentResponse = await fetch('/api/stats/stats/leaderboard/tournaments?limit=10');
        let tournamentData: { data: LeaderboardEntry[] } = { data: [] };
        
        if (tournamentResponse.ok) {
          tournamentData = await tournamentResponse.json();
        } else {
          console.error('Failed to fetch tournament leaderboard:', tournamentResponse.status);
        }
        
        // We'll fetch fastest wins from the same data
        // In a real implementation, this should be fetched from a dedicated endpoint
        // For now, we'll use empty data (will be replaced with proper API call)
        
        // Fetch total games data
        const totalGamesResponse = await fetch('/api/stats/stats/leaderboard/totalgames?limit=10');
        let totalGamesData: { data: LeaderboardEntry[] } = { data: [] };
        
        if (totalGamesResponse.ok) {
          totalGamesData = await totalGamesResponse.json();
        } else {
          console.error('Failed to fetch total games leaderboard:', totalGamesResponse.status);
          // If the API doesn't exist, we'll show empty data
          totalGamesData = { data: [] };
        }
        
        // Fetch fastest wins data
        const fastestWinsResponse = await fetch('/api/stats/stats/leaderboard/fastest?limit=10');
        let fastestWinsData: { data: LeaderboardEntry[] } = { data: [] };
        
        if (fastestWinsResponse.ok) {
          fastestWinsData = await fastestWinsResponse.json();
        } else {
          console.error('Failed to fetch fastest wins leaderboard:', fastestWinsResponse.status);
          // If the API doesn't exist, we'll show empty data
          fastestWinsData = { data: [] };
        }
        
        setLeaderboards({
          wins: winsData.data || [],
          winrate: winRateData.data || [],
          tournaments: tournamentData.data || [],
          fastest: fastestWinsData.data || [],
          totalGames: totalGamesData.data || []
        });
      } catch (err) {
        console.error('Error fetching leaderboards:', err);
        setError(t('leaderboard.errorFetching'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaderboards();
  }, [t]);
  
  // Handle navigating to player details
  const navigateToPlayerDetails = (userId: string) => {
    navigate(`/rankings?user=${userId}`);
  };
  
  // Get the correct data based on active category
  const getActiveLeaderboard = (): LeaderboardEntry[] => {
    return leaderboards[activeCategory] || [];
  };
  
  // Category tabs configuration
  const categories = [
    { 
      id: 'wins' as LeaderboardCategory, 
      label: t('leaderboard.mostWins'), 
      icon: <Trophy className="w-4 h-4 mr-2" />,
      color: 'from-amber-400 to-yellow-600' 
    },
    { 
      id: 'winrate' as LeaderboardCategory, 
      label: t('leaderboard.bestWinRate'), 
      icon: <Award className="w-4 h-4 mr-2" />,
      color: 'from-emerald-400 to-green-600' 
    },
    { 
      id: 'tournaments' as LeaderboardCategory, 
      label: t('leaderboard.tournamentWins'), 
      icon: <Medal className="w-4 h-4 mr-2" />,
      color: 'from-violet-400 to-purple-600' 
    },
    { 
      id: 'fastest' as LeaderboardCategory, 
      label: t('leaderboard.fastestWins'), 
      icon: <Zap className="w-4 h-4 mr-2" />,
      color: 'from-blue-400 to-indigo-600' 
    },
    { 
      id: 'totalGames' as LeaderboardCategory, 
      label: t('leaderboard.mostGames'), 
      icon: <BarChart3 className="w-4 h-4 mr-2" />,
      color: 'from-rose-400 to-red-600' 
    }
  ];
  
  // Get medal styling for top positions
  const getMedalStyle = (position: number) => {
    switch (position) {
      case 0: // 1st place
        return 'bg-gradient-to-r from-yellow-300 to-amber-600 text-white';
      case 1: // 2nd place
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 2: // 3rd place
        return 'bg-gradient-to-r from-amber-700 to-yellow-800 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };
  
  // Format a value for display, handling undefined/null values
  const formatValue = (value: number | undefined, suffix: string = ''): string => {
    if (value === undefined || value === null) {
      return '-';
    }
    return `${value}${suffix}`;
  };
  
  // Format time in seconds to mm:ss format
  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null) {
      return '-';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get the right value to display based on the active category
  const getDisplayValue = (entry: LeaderboardEntry, index: number): string => {
    switch (activeCategory) {
      case 'wins':
        return formatValue(entry.wins);
      case 'winrate':
        return formatValue(entry.win_rate, '%');
      case 'tournaments':
        return formatValue(entry.tournament_wins);
      case 'fastest':
        return formatTime(entry.fastest_win);
      case 'totalGames':
        return formatValue(entry.total_games);
      default:
        return '-';
    }
  };
  
  // Get column header based on active category
  const getColumnHeader = (): string => {
    switch (activeCategory) {
      case 'wins':
        return t('leaderboard.wins');
      case 'winrate':
        return t('leaderboard.winRate');
      case 'tournaments':
        return t('leaderboard.tournaments');
      case 'fastest':
        return t('leaderboard.time');
      case 'totalGames':
        return t('leaderboard.games');
      default:
        return '';
    }
  };

  // Generate rows, using real data for as many entries as available, then filling with placeholders up to 10
  const generateTableRows = () => {
    const activeLeaderboard = getActiveLeaderboard();
    const rows = [];

    // First add all available data rows
    for (let i = 0; i < activeLeaderboard.length; i++) {
      const entry = activeLeaderboard[i];
      rows.push(
        <tr key={`${entry.player_id}-${i}`} className="hover:bg-gray-700/30">
          <td className="py-4 px-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getMedalStyle(i)}`}>
              {i + 1}
            </div>
          </td>
          <td className="py-4 px-4 text-white font-medium">
            <button 
              onClick={() => navigateToPlayerDetails(entry.user_id)}
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              {entry.user_id}
            </button>
          </td>
          <td className="py-4 px-4 text-right">
            <span className={`font-bold ${i < 3 ? 'text-blue-400' : 'text-gray-300'}`}>
              {getDisplayValue(entry, i)}
            </span>
          </td>
        </tr>
      );
    }

    // Then fill with placeholder rows up to 10
    for (let i = activeLeaderboard.length; i < 10; i++) {
      rows.push(
        <tr key={`placeholder-${i}`} className="hover:bg-gray-700/30">
          <td className="py-4 px-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getMedalStyle(i)}`}>
              {i + 1}
            </div>
          </td>
          <td className="py-4 px-4 text-gray-500">
            -
          </td>
          <td className="py-4 px-4 text-right text-gray-500">
            -
          </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 mb-4">
            {t('leaderboard.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('leaderboard.subtitle')}
          </p>
        </div>
        
        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                activeCategory === category.id
                ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                : 'bg-gray-800/60 backdrop-blur-sm border border-gray-700 text-gray-300 hover:bg-gray-700/60'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>
        
        {/* Leaderboard Table */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
          <div className={`h-2 bg-gradient-to-r ${categories.find(c => c.id === activeCategory)?.color || 'from-blue-600 to-indigo-700'}`}></div>
          
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              {categories.find(c => c.id === activeCategory)?.icon}
              <span className="ml-2">{categories.find(c => c.id === activeCategory)?.label}</span>
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="bg-red-900/40 border border-red-500/50 text-red-100 p-4 rounded-lg">
                <p>{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-gray-700">
                      <th className="pb-4 px-4 text-gray-400 font-medium w-16 text-center">#</th>
                      <th className="pb-4 px-4 text-gray-400 font-medium">{t('leaderboard.player')}</th>
                      <th className="pb-4 px-4 text-gray-400 font-medium text-right">{getColumnHeader()}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {generateTableRows()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;