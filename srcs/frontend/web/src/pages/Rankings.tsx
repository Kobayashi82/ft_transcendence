import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronRight, ChevronDown, X, Trophy, User, Calendar, Settings, Info } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Types for API responses
interface PlayerStats {
  player_id: number;
  user_id: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_score: number;
  total_tournaments: number;
  tournament_wins: number;
  recent_games: RecentGame[];
  recent_tournaments: RecentTournament[];
}

interface RecentGame {
  id: number;
  start_time: string;
  end_time: string;
  score: number;
}

interface RecentTournament {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  final_position: number | null;
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

interface TournamentDetails {
  id: number;
  name: string;
  start_time: string;
  end_time: string | null;
  settings: {
    format: string;
    pointsToWin: number;
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

// Extended tournament interface with expanded state
interface TournamentWithExpand extends TournamentDetails {
  isExpanded: boolean;
}

const RankingsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State variables
  const [userId, setUserId] = useState<string>(searchParams.get("user") || "");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<number, GameDetails>>({});
  const [tournaments, setTournaments] = useState<TournamentWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Effect to load data when userId in URL changes
  useEffect(() => {
    const userIdFromUrl = searchParams.get("user");
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      fetchUserStats(userIdFromUrl);
    }
  }, [searchParams]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    
    setSearchParams({ user: userId });
    fetchUserStats(userId);
  };

  // Clear search results
  const clearSearch = () => {
    setUserId("");
    setPlayerStats(null);
    setGameDetails({});
    setTournaments([]);
    setError(null);
    setSearchParams({});
  };

  // Toggle tournament expansion to show games
  const toggleTournamentExpand = (tournamentId: number) => {
    setTournaments(prevTournaments => 
      prevTournaments.map(tournament => 
        tournament.id === tournamentId 
          ? { ...tournament, isExpanded: !tournament.isExpanded } 
          : tournament
      )
    );
  };

  // Fetch user statistics
  const fetchUserStats = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stats/stats/user/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t('rankings.userNotFound'));
        }
        throw new Error(`${t('rankings.errorFetchingStats')}: ${response.status}`);
      }
      
      const data: PlayerStats = await response.json();
      setPlayerStats(data);
      
      // Fetch detailed information for each game
      await fetchGameDetails(data.recent_games);
      
      // Fetch detailed information for each tournament
      await fetchTournamentDetails(data.recent_tournaments);
      
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
      setError(err instanceof Error ? err.message : t('rankings.unknownError'));
      setPlayerStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detailed information for games
  const fetchGameDetails = async (games: RecentGame[]) => {
    const gameDetailsMap: Record<number, GameDetails> = {};
    
    for (const game of games) {
      try {
        const response = await fetch(`/api/stats/games/${game.id}`);
        if (response.ok) {
          const data: GameDetails = await response.json();
          gameDetailsMap[game.id] = data;
        }
      } catch (err) {
        console.error(`Failed to fetch details for game ${game.id}:`, err);
      }
    }
    
    setGameDetails(gameDetailsMap);
  };

  // Fetch detailed information for tournaments
  const fetchTournamentDetails = async (tournaments: RecentTournament[]) => {
    const tournamentsList: TournamentWithExpand[] = [];
    
    for (const tournament of tournaments) {
      try {
        const response = await fetch(`/api/stats/tournaments/${tournament.id}`);
        if (response.ok) {
          const data: TournamentDetails = await response.json();
          tournamentsList.push({ ...data, isExpanded: false });
        }
      } catch (err) {
        console.error(`Failed to fetch details for tournament ${tournament.id}:`, err);
      }
    }
    
    setTournaments(tournamentsList);
  };

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

  // Get position text
  const getPositionText = (position: number | null) => {
    if (!position) return t('rankings.unknown');
    
    switch (position) {
      case 1: return t('rankings.first');
      case 2: return t('rankings.second');
      case 3: return t('rankings.third');
      case 4: return t('rankings.fourth');
      default: return position.toString();
    }
  };

  // Get winner of tournament
  const getTournamentWinner = (tournament: TournamentDetails) => {
    const winner = tournament.players.find(player => player.final_position === 1);
    return winner ? winner.user_id : t('rankings.unknown');
  };

  // Format participants list
  const formatParticipants = (players: { user_id: string }[]) => {
    return players.map(player => player.user_id).join(", ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 mb-4">
            {t('rankings.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('rankings.subtitle')}
          </p>
        </div>

        {/* Search form */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-10">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={t('rankings.searchPlaceholder')}
				spellCheck="false"
                className="block w-full pl-10 pr-12 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {userId && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                t('rankings.search')
              )}
            </button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg mb-8">
            <p>{error}</p>
          </div>
        )}

        {/* Player statistics */}
        {playerStats && (
          <div className="space-y-8">
            {/* Player overview */}
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <User className="mr-2 h-6 w-6 text-blue-400" />
                  {playerStats.user_id}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700/40 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">{t('rankings.gamesPlayed')}</p>
                    <p className="text-2xl font-bold text-white">{playerStats.total_games}</p>
                  </div>
                  <div className="bg-gray-700/40 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">{t('rankings.winRate')}</p>
                    <p className="text-2xl font-bold text-white">{playerStats.win_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-700/40 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">{t('rankings.tournaments')}</p>
                    <p className="text-2xl font-bold text-white">{playerStats.total_tournaments}</p>
                  </div>
                  <div className="bg-gray-700/40 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">{t('rankings.tournamentWins')}</p>
                    <p className="text-2xl font-bold text-white">{playerStats.tournament_wins}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent games */}
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
                      {playerStats.recent_games.map(game => {
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
                              {details ? getOpponent(details, playerStats.user_id) : "-"}
                            </td>
                            <td className="py-4 px-4">
                              {details ? (
                                <div className="flex items-center">
                                  <span className="font-bold text-blue-400">
                                    {getPlayerScore(details, playerStats.user_id)}
                                  </span>
                                  <span className="mx-2 text-gray-500">-</span>
                                  <span className="font-bold text-red-400">
                                    {getOpponentScore(details, playerStats.user_id)}
                                  </span>
                                  <span className="ml-3 px-2 py-1 text-xs rounded-full bg-opacity-20 font-medium whitespace-nowrap"
                                    style={{
                                      backgroundColor: getGameResult(details, playerStats.user_id).includes(t('rankings.win')) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                      color: getGameResult(details, playerStats.user_id).includes(t('rankings.win')) ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                                    }}
                                  >
                                    {getGameResult(details, playerStats.user_id)}
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
                      
                      {playerStats.recent_games.length === 0 && (
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

            {/* Tournaments */}
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600"></div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Trophy className="mr-2 h-6 w-6 text-amber-400" />
                  {t('rankings.tournaments')}
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left border-b border-gray-700">
                        <th className="pb-3 px-4 text-gray-400 font-medium" style={{ width: '40px' }}></th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.tournamentName')}
                        </th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.date')}
                        </th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.participants')}
                        </th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.winner')}
                        </th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.playerPosition')}
                        </th>
                        <th className="pb-3 px-4 text-gray-400 font-medium">
                          {t('rankings.settings')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map(tournament => (
                        <React.Fragment key={tournament.id}>
                          {/* Tournament row */}
                          <tr className="hover:bg-gray-700/30 cursor-pointer border-b border-gray-700/50" onClick={() => toggleTournamentExpand(tournament.id)}>
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
                              {getPositionText(tournament.players.find(p => p.user_id === playerStats.user_id)?.final_position || null)}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              <div className="text-sm">
                                <p>{t('rankings.format')}: {tournament.settings.format || "-"}</p>
                                <p>{t('rankings.pointsToWin')}: {tournament.settings.pointsToWin || "-"}</p>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded tournament games */}
                          {tournament.isExpanded && (
                            <tr>
                              <td colSpan={7} className="py-0 px-0">
                                <div className="bg-gray-700/30 p-4">
                                  <h4 className="text-white font-medium mb-3 pl-8">
                                    {t('rankings.tournamentGames')}
                                  </h4>
                                  <div className="overflow-x-auto pl-8 pr-4">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="text-left border-b border-gray-600">
                                          <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                            {t('rankings.round')}
                                          </th>
                                          <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                            {t('rankings.players')}
                                          </th>
                                          <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                            {t('rankings.score')}
                                          </th>
                                          <th className="pb-2 px-4 text-gray-400 font-medium text-sm">
                                            {t('rankings.duration')}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-600/50">
                                        {tournament.games.map((game, index) => (
                                          <tr key={game.id} className="hover:bg-gray-600/30">
                                            <td className="py-3 px-4 text-gray-300">
                                              {t('rankings.round')} {index + 1}
                                            </td>
                                            <td className="py-3 px-4 text-gray-300">
                                              {game.players.map(p => p.user_id).join(" vs ")}
                                            </td>
                                            <td className="py-3 px-4">
                                              <div className="flex items-center">
                                                <span className={`font-bold ${game.players[0].user_id === playerStats.user_id ? 'text-blue-400' : 'text-gray-300'}`}>
                                                  {game.players[0].score}
                                                </span>
                                                <span className="mx-2 text-gray-500">-</span>
                                                <span className={`font-bold ${game.players[1]?.user_id === playerStats.user_id ? 'text-blue-400' : 'text-gray-300'}`}>
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
                                              {t('rankings.noGamesInTournament')}
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
                            {t('rankings.noTournamentsFound')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state - show only if not loading and no stats */}
        {!isLoading && !playerStats && !error && (
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <Info className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">{t('rankings.searchForPlayer')}</h3>
            <p className="text-gray-400 mb-6">{t('rankings.enterUserIdToView')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;