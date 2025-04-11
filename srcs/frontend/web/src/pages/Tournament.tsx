import React, { useState, useEffect } from "react";
import { Trophy, Users, Settings, Info, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import GameModal from "../components/game/GameModal";

// Default game options type
interface GameOptions {
  ballSpeed: string[];
  paddleSize: string[];
  winningScore: { min: number; max: number };
  accelerationEnabled: boolean[];
  default?: {
    ballSpeed: string;
    winningScore: number;
    accelerationEnabled: boolean;
    paddleSize: string;
    ai_opponents?: string[];
  };
}

// Player type definition
interface Player {
  id: number;
  user_id: string;
  isAI?: boolean;
}

const TournamentPage: React.FC = () => {
  const { t } = useLanguage();
  
  // State for game configuration
  const [options, setOptions] = useState<GameOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for player selection
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(["", "", "", ""]);
  const [showAIList, setShowAIList] = useState<number | null>(null);

  // Refs for dropdown areas
  const dropdownRefs = React.useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  // State for game settings
  const [ballSpeed, setBallSpeed] = useState<string>("medium");
  const [paddleSize, setPaddleSize] = useState<string>("medium");
  const [winningScore, setWinningScore] = useState<number>(5);
  const [accelerationEnabled, setAccelerationEnabled] = useState<boolean>(false);
  
  // State for game creation and modal
  const [gameId, setGameId] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState<boolean>(false);

  // Fetch game options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/game/options");
        
        if (!response.ok) {
          throw new Error(`Error fetching game options: ${response.status}`);
        }
        
        const data: GameOptions = await response.json();
        console.log("Game options received:", data);
        setOptions(data);
        
        // Set default values if available
        if (data.default) {
          setBallSpeed(data.default.ballSpeed);
          setPaddleSize(data.default.paddleSize);
          setWinningScore(data.default.winningScore);
          setAccelerationEnabled(data.default.accelerationEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch game options:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        
        // Set fallback default values
        setBallSpeed("medium");
        setPaddleSize("medium");
        setWinningScore(5);
        setAccelerationEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchPlayers = async () => {
      try {
        const response = await fetch("/api/stats/players");
        
        if (!response.ok) {
          throw new Error(`Error fetching players: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if the data is in the expected format
        if (data && data.data && Array.isArray(data.data)) {
          setPlayers(data.data);
        } else {
          console.error("Unexpected player data format:", data);
        }
      } catch (err) {
        console.error("Failed to fetch players:", err);
      }
    };
    
    fetchOptions();
    fetchPlayers();
  }, []);

  // Create a tournament
  const createTournament = async () => {
    if (selectedPlayers.filter(p => p !== "").length !== 4) {
      setError(t('tournament.error.selectExactlyFourPlayers'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const tournamentData = {
        players: selectedPlayers,
        settings: {
          ballSpeed,
          paddleSize,
          winningScore: Number(winningScore),
          accelerationEnabled
        }
      };
      
      console.log("Creating tournament with data:", tournamentData);
      
      const response = await fetch("/api/game/tournament/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tournamentData),
      });
                  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error creating game: ${response.status}`);
      }

      const data = await response.json();
      console.log("Tournament created:", data);

      setGameId(data.firstMatchId);
      setIsGameModalOpen(true);
      
    } catch (err) {
      console.error("Failed to create tournament:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Handle closing the game modal
  const handleCloseGame = () => {
    setIsGameModalOpen(false);
    setGameId(null);
  };

  // Toggle AI list display
  const toggleAIList = (playerIndex: number) => {
    if (showAIList === playerIndex) {
      setShowAIList(null);
    } else {
      setShowAIList(playerIndex);
    }
  };
  
  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAIList !== null) {
        const ref = dropdownRefs.current[showAIList];
        if (ref && !ref.contains(event.target as Node)) {
          setShowAIList(null);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAIList]);

  // Select a player
  const selectPlayer = (playerIndex: number, userId: string) => {   
    const newSelectedPlayers = [...selectedPlayers];
    newSelectedPlayers[playerIndex] = userId;
    setSelectedPlayers(newSelectedPlayers);
    setShowAIList(null);
  };

  // Get AI opponents from options
  const getAIOpponents = () => {
    return options?.default?.ai_opponents || [];
  };

  // Get display text for speed/size options
  const getOptionDisplayText = (option: string) => {
    switch(option.toLowerCase()) {
      case 'slow':
        return t('tournament.slow');
      case 'medium':
        return t('tournament.medium');
      case 'fast':
        return t('tournament.fast');
      case 'short':
        return t('tournament.short');
      case 'long':
        return t('tournament.long');
      default:
        return option.charAt(0).toUpperCase() + option.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-500 leading-[1.3] pb-4">
            {t('tournament.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('tournament.subtitle')}
          </p>
        </div>
        
        {/* Success display */}
        {success && (
          <div className="bg-green-900/40 border border-green-500/50 text-green-100 px-4 py-3 rounded-lg mb-8">
            <div className="flex">
              <Check className="h-5 w-5 text-green-300 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
            <button 
              className="text-green-300 hover:text-green-100 text-sm underline mt-1"
              onClick={() => setSuccess(null)}
            >
              {t('common.clear')}
            </button>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg mb-8">
            <p>{error}</p>
            <button 
              className="text-red-300 hover:text-red-100 text-sm underline mt-1"
              onClick={() => setError(null)}
            >
              {t('common.clear')}
            </button>
          </div>
        )}
        
        {/* Tournament setup */}
        {!isGameModalOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Player selection */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
                <div className="h-2 bg-gradient-to-r from-purple-600 to-indigo-700"></div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <Users className="mr-2 h-6 w-6 text-purple-400" />
                    {t('tournament.humanPlayers')}
                  </h2>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Player selections */}
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="mb-4">
                          <label className="block text-gray-300 text-sm font-medium mb-2">
                            {t('tournament.player')} {index + 1}
                          </label>
                          <div className="relative" ref={(el) => (dropdownRefs.current[index] = el)}>
                            <input
                              type="text"
                              value={selectedPlayers[index]}
                              onChange={(e) => {
                                const newSelectedPlayers = [...selectedPlayers];
                                newSelectedPlayers[index] = e.target.value;
                                setSelectedPlayers(newSelectedPlayers);
                              }}
                              placeholder={t('tournament.selectPlayer')}
                              spellCheck="false"
                              className="w-full pr-10 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              onClick={() => setShowAIList(null)}
                            />
                            <button 
                              onClick={() => toggleAIList(index)}
                              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            {showAIList === index && (
                              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                                <div className="flex h-40 mb-1">
                                  {/* AI Opponents Column */}
                                  <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                                    <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-2 z-10">
                                      <div className="font-medium text-purple-400 px-2 py-1 text-sm">{t('tournament.aiOpponents')}</div>
                                    </div>
                                    <div className="p-2">
                                      {getAIOpponents().map((ai) => (
                                        <div
                                          key={`ai-${ai}`}
                                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-gray-300 text-sm"
                                          onClick={() => selectPlayer(index, ai)}
                                        >
                                          {ai}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Human Players Column */}
                                  <div className="w-1/2 overflow-y-auto">
                                    <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-2 z-10">
                                      <div className="font-medium text-purple-400 px-2 py-1 text-sm">{t('tournament.humanPlayers')}</div>
                                    </div>
                                    <div className="p-2">
                                      {players
                                        .filter(player => !selectedPlayers.includes(player.user_id) || player.user_id === selectedPlayers[index])
                                        .map((player) => (
                                          <div
                                            key={player.id}
                                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-gray-300 text-sm"
                                            onClick={() => selectPlayer(index, player.user_id)}
                                          >
                                            {player.user_id}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Info text */}
                      <div className="mt-3 p-3 pt-1">
                        <p className="text-gray-500 text-sm">
                          {t('tournament.playerHelp')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-auto pt-4">
                      <button
                        onClick={createTournament}
                        disabled={loading || selectedPlayers.filter(p => p !== "").length !== 4}
                        className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                          (loading || selectedPlayers.filter(p => p !== "").length !== 4) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trophy className="mr-2 h-5 w-5" />
                        {t('home.playNow')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column - Game Settings */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-700"></div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Settings className="mr-2 h-6 w-6 text-indigo-400" />
                    {t('tournament.settings')}
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Ball Speed */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        {t('tournament.ballSpeed')}
                      </label>
                      <div className="flex space-x-2">
                        {options?.ballSpeed.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setBallSpeed(speed)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              ballSpeed === speed
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {getOptionDisplayText(speed)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Paddle Size */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        {t('tournament.paddleSize')}
                      </label>
                      <div className="flex space-x-2">
                        {options?.paddleSize.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setPaddleSize(size)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              paddleSize === size
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {getOptionDisplayText(size)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Winning Score */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        {t('tournament.winningScore')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={options?.winningScore?.min || 1}
                          max={options?.winningScore?.max || 20}
                          value={winningScore}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const min = options?.winningScore?.min || 1;
                            const max = options?.winningScore?.max || 20;
                            if (val >= min && val <= max) {
                              setWinningScore(val);
                            }
                          }}
                          className="w-full h-9 p-2 pl-3 pr-20 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-8 pointer-events-none">
                          <span className="text-gray-400 text-sm">{t('tournament.points')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Acceleration Enabled */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        {t('tournament.acceleration')}
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setAccelerationEnabled(true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            accelerationEnabled
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {t('tournament.enabled')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccelerationEnabled(false)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            !accelerationEnabled
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {t('tournament.disabled')}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tournament explanation */}
                  <div className="mt-8 bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-gray-300 text-sm">
                        {t('tournament.gameHelp')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Game Modal */}
      {isGameModalOpen && gameId && (
        <GameModal
          gameId={gameId}
          player1={selectedPlayers[0]} // Only needed for initial display, will be overridden by WebSocket
          player2={selectedPlayers[1]} // Only needed for initial display, will be overridden by WebSocket
          ballSpeed={ballSpeed}
          paddleSize={paddleSize}
          winningScore={winningScore}
          accelerationEnabled={accelerationEnabled}
          onClose={handleCloseGame}
          isTournament={true}
          tournamentRound={1} // Initial round
        />
      )}
    </div>
  );
};

export default TournamentPage;