import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, Info } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import PlayerOverview from "../components/stats/PlayerOverview";
import GamesTable from "../components/stats/GamesTable";
import TournamentsTable from "../components/stats/TournamentsTable";

interface Player {
	id: number;
	user_id: string;
  }

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
  }
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
  }
  status: string;
  players: {
    id: number;
    user_id: string;
    final_position: number | null;
  }[];
  games: GameDetails[];
}

interface TournamentWithExpand extends TournamentDetails { isExpanded: boolean; }
interface User { id: string; user_id: string; }

const customSelectStyles = `
  /* Estilos para el select */
  .custom-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.5em;
    padding-right: 2.5rem;
  }

  /* Estilos para cuando el select está enfocado */
  .custom-select:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  /* Estilos para las opciones del select */
  .custom-select option {
    background-color: #1F2937;
    color: white;
    padding: 0.75rem;
  }

  /* Destacar la opción al pasar el mouse */
  .custom-select option:hover {
    background-color: #374151;
  }
`;

const RankingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userId, setUserId] = useState<string>(searchParams.get("user") || "");
  const [error, setError] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<number, GameDetails>>({});
  const [tournaments, setTournaments] = useState<TournamentWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [_, setFilteredUsers] = useState<User[]>([]);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { fetchUsersList(); }, []);
  useEffect(() => {
    const userIdFromUrl = searchParams.get("user");
    if (userIdFromUrl) { setUserId(userIdFromUrl); fetchUserStats(userIdFromUrl); }
  }, [searchParams]);

  useEffect(() => {
    if (userId) {
      const filtered = usersList.filter(user => user.user_id.toLowerCase().includes(userId.toLowerCase()));
      setFilteredUsers(filtered);
    } else setFilteredUsers(usersList);
  }, [userId, usersList]);

  const fetchUsersList = async () => {
    try {
      const response = await fetch('/api/stats/players');
      if (!response.ok) throw new Error(`Error fetching users: ${response.status}`);
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const users = data.data.map((player: Player) => ({ id: player.id ? player.id.toString() : '', user_id: player.user_id }));
        const sortedUsers = users.sort((a: User, b: User) => a.user_id.localeCompare(b.user_id));

        setUsersList(sortedUsers);
        setFilteredUsers(sortedUsers);
      }
    } catch (err) {}
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setSearchParams({ user: userId });
    fetchUserStats(userId);
  }

  const clearSearch = () => {
    setUserId("");
    setPlayerStats(null);
    setGameDetails({});
    setTournaments([]);
    setError(null);
    setSearchParams({});
    if (selectRef.current) selectRef.current.selectedIndex = 0;
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      setUserId(e.target.value);
      setSearchParams({ user: e.target.value });
      fetchUserStats(e.target.value);
    }
  }

  const toggleTournamentExpand = (tournamentId: number) => { setTournaments(prevTournaments => prevTournaments.map(tournament => tournament.id === tournamentId ? { ...tournament, isExpanded: !tournament.isExpanded } : tournament)); }
  const fetchUserStats = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stats/stats/user/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error(t('stats.userNotFound'));
        throw new Error(`${t('stats.errorFetchingStats')}: ${response.status}`);
      }
      
      const data: PlayerStats = await response.json();
      setPlayerStats(data);
      
      await fetchGameDetails(data.recent_games);
      await fetchTournamentDetails(data.recent_tournaments);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('stats.unknownError'));
      setPlayerStats(null);
    } finally { setIsLoading(false); }
  }

  const fetchGameDetails = async (games: RecentGame[]) => {
    const gameDetailsMap: Record<number, GameDetails> = {}

    for (const game of games) {
      try {
        const response = await fetch(`/api/stats/games/${game.id}`);
        if (response.ok) {
          const data: GameDetails = await response.json();
          gameDetailsMap[game.id] = data;
        }
      } catch (err) {}
    }
    setGameDetails(gameDetailsMap);
  }

  const fetchTournamentDetails = async (tournaments: RecentTournament[]) => {
    const tournamentsList: TournamentWithExpand[] = [];

    for (const tournament of tournaments) {
      try {
        const response = await fetch(`/api/stats/tournaments/${tournament.id}`);
        if (response.ok) {
          const data: TournamentDetails = await response.json();
          tournamentsList.push({ ...data, isExpanded: false });
        }
      } catch (err) {}
    }
    setTournaments(tournamentsList);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
    if (selectRef.current) selectRef.current.selectedIndex = 0;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <style>{customSelectStyles}</style>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
		<h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 leading-[1.3] pb-4">
            {t('stats.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('stats.subtitle')}
          </p>
        </div>

        {/* Search form with styled dropdown */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-10 relative">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={userId}
                  onChange={handleInputChange}
                  placeholder={t('stats.searchPlaceholder')}
                  spellCheck="false"
                  className="block w-full pl-10 pr-12 py-3 border border-gray-600 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {userId && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-3 flex items-center"
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
                  t('stats.search')
                )}
              </button>
            </div>

            {/* Styled select dropdown for users */}
            <div className="relative">
              <select
                ref={selectRef}
                onChange={handleSelectChange}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 custom-select"
                value=""
              >
                <option value="" disabled>
                  {t('stats.selectUser')}
                </option>
                {usersList.map(user => (
                  <option key={user.id || user.user_id} value={user.user_id}>
                    {user.user_id}
                  </option>
                ))}
              </select>
            </div>
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
            {/* Player Overview Component */}
            <PlayerOverview playerStats={playerStats} />

            {/* Games Table Component */}
            <GamesTable 
              games={playerStats.recent_games} 
              gameDetails={gameDetails} 
              userId={playerStats.user_id} 
            />

            {/* Tournaments Table Component */}
            <TournamentsTable 
              tournaments={tournaments} 
              userId={playerStats.user_id} 
              onToggleExpand={toggleTournamentExpand} 
            />
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !playerStats && !error && (
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <Info className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">{t('stats.searchForPlayer')}</h3>
            <p className="text-gray-400 mb-6">{t('stats.enterUserIdToView')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RankingsPage;
