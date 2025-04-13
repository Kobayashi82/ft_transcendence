import React, { useState, useEffect } from "react";
import { Gamepad2, Users, Settings, Info, Check, ChevronDown } from "lucide-react";
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

const QuickMatchPage: React.FC = () => {
  const { t } = useLanguage();

  // State for game configuration
  const [options, setOptions] = useState<GameOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for player selection
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(["", ""]);
  const [showAIList, setShowAIList] = useState<number | null>(null);

  // Refs for dropdown areas
  const dropdownRefs = React.useRef<(HTMLDivElement | null)[]>([null, null]);

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
        setOptions(data);
        
        // Set default values if available
        if (data.default) {
          setBallSpeed(data.default.ballSpeed);
          setPaddleSize(data.default.paddleSize);
          setWinningScore(data.default.winningScore);
          setAccelerationEnabled(data.default.accelerationEnabled);
        }
      } catch (err) {
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
          // Ordenar jugadores alfabéticamente por user_id
          const sortedPlayers = [...data.data].sort((a, b) => 
            a.user_id.localeCompare(b.user_id)
          );
          setPlayers(sortedPlayers);
        }
      } catch (err) {}
    };
    
    fetchOptions();
    fetchPlayers();
  }, []);

  // Create a new game
  const createGame = async () => {
    // Validar que los nombres de los jugadores no están vacíos ni contienen solo espacios en blanco
    if (!selectedPlayers[0].trim() || !selectedPlayers[1].trim()) {
      setError(t('quickMatch.error.selectBothPlayers'));
      return;
    }
    
    // Normalizar los nombres de jugadores
    const normalizedPlayers = selectedPlayers.map(player => normalizeAIName(player.trim()));
    
    // Validar que no se hayan seleccionado jugadores duplicados (excepto IAs)
    const player1IsAI = isAIPlayer(normalizedPlayers[0]);
    const player2IsAI = isAIPlayer(normalizedPlayers[1]);
    
    // Verificamos duplicados solo si NO son ambos IAs
    if (normalizedPlayers[0].toLowerCase() === normalizedPlayers[1].toLowerCase() && 
        !(player1IsAI && player2IsAI)) {
      setError(t('quickMatch.error.duplicatePlayers'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
    
      // Ya no es necesario transformar los nombres de IAs con el prefijo AI_
      // Usamos directamente los nombres normalizados
      const gameData = {
        players: normalizedPlayers,
        settings: {
          ballSpeed,
          paddleSize,
          winningScore: Number(winningScore),
          accelerationEnabled
        }
      };
      
      const response = await fetch("/api/game/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error creating game: ${response.status}`);
      }
      
      const data = await response.json();
      
      setGameId(data.gameId);
      setSelectedPlayers(normalizedPlayers);
      setIsGameModalOpen(true);
      
    } catch (err) {
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
    // Verificar si el jugador ya está seleccionado en la otra posición
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
    
    // Permitimos seleccionar la misma IA para ambos jugadores
    const aiNames = getAIOpponents();
    const isAI = aiNames.includes(userId);
    
    // Solo verificamos duplicados si NO es una IA
    if (userId === selectedPlayers[otherPlayerIndex] && !isAI) {
      // Si el jugador ya está seleccionado en la otra posición y no es una IA, mostrar un error
      setError(t('quickMatch.error.playerAlreadySelected'));
      return;
    }

    const newSelectedPlayers = [...selectedPlayers];
    newSelectedPlayers[playerIndex] = userId;
    setSelectedPlayers(newSelectedPlayers);
    setShowAIList(null);
  };

  // Get AI opponents from options
  const getAIOpponents = () => {
    return options?.default?.ai_opponents || [];
  };

  // Verificar si un nombre coincide con una IA
  const isAIPlayer = (playerName: string) => {
    const aiNames = getAIOpponents();
    // Comprobación insensible a mayúsculas/minúsculas
    return aiNames.some(ai => ai.toLowerCase() === playerName.toLowerCase());
  };

  // Normalizar el nombre de una IA para usar el formato exacto del backend
  const normalizeAIName = (playerName: string) => {
    const aiNames = getAIOpponents();
    const matchedAI = aiNames.find(ai => ai.toLowerCase() === playerName.toLowerCase());
    return matchedAI || playerName; // Devuelve el nombre normalizado o el original si no es IA
  };

  // Get display text for speed/size options
  const getOptionDisplayText = (option: string) => {
    switch(option.toLowerCase()) {
      case 'slow':
        return t('quickMatch.slow');
      case 'medium':
        return t('quickMatch.medium');
      case 'fast':
        return t('quickMatch.fast');
      case 'short':
        return t('quickMatch.short');
      case 'long':
        return t('quickMatch.long');
      default:
        return option.charAt(0).toUpperCase() + option.slice(1);
    }
  };

  // Manejar cambios en el input de puntos para ganar
  const handleWinningScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Permite borrar completamente el input para ingresar un nuevo valor
    if (inputValue === '') {
      setWinningScore(0);
      return;
    }
    
    const val = parseInt(inputValue);
    const min = options?.winningScore?.min || 1;
    const max = options?.winningScore?.max || 20;
    
    if (!isNaN(val) && val >= min && val <= max) {
      setWinningScore(val);
    }
  };
  
  // Manejar cuando el input pierde el foco
  const handleWinningScoreBlur = () => {
    // Si el valor es 0, restaurar al mínimo permitido
    if (winningScore === 0) {
      const min = options?.winningScore?.min || 1;
      setWinningScore(min);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 leading-[1.3] pb-4">
            {t('quickMatch.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t('quickMatch.subtitle')}
          </p>
        </div>
        
        {/* Success display */}
        {success && !isGameModalOpen && (
          <div className="bg-green-900/40 border border-green-500/50 text-green-100 px-4 py-3 rounded-lg mb-8">
            <div className="flex">
              <Check className="h-5 w-5 text-green-300 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
            <button 
              className="text-green-300 hover:text-green-100 text-sm underline mt-1"
              onClick={() => setSuccess(null)}
            >
              Clear
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
              Clear
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Player selection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Users className="mr-2 h-6 w-6 text-blue-400" />
                  {t('quickMatch.players')}
                </h2>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Player selections */}
                    {[0, 1].map((index) => (
                      <div key={index} className="mb-4">
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          {t('quickMatch.player')} {index + 1}
                        </label>
                        <div className="relative" ref={(el) => (dropdownRefs.current[index] = el)}>
                          <input
                            type="text"
                            value={selectedPlayers[index]}
                            onChange={(e) => {
                              const newSelectedPlayers = [...selectedPlayers];
                              newSelectedPlayers[index] = e.target.value.slice(0, 20);
                              setSelectedPlayers(newSelectedPlayers);
                            }}
                            placeholder={t('quickMatch.selectPlayer')}
                            spellCheck="false"
                            maxLength={20}
                            className="w-full pr-10 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                                    <div className="font-medium text-blue-400 px-2 py-1 text-sm">{t('quickMatch.aiOpponents')}</div>
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
                                    <div className="font-medium text-blue-400 px-2 py-1 text-sm">{t('quickMatch.humanPlayers')}</div>
                                  </div>
                                  <div className="p-2">
                                    {players
                                      .filter(player => {
                                        // Filtrar IAs de la columna de jugadores humanos
                                        const aiNames = getAIOpponents();
                                        const isAI = aiNames.includes(player.user_id);
                                        
                                        // No mostrar IAs y no mostrar jugador ya seleccionado en la otra posición
                                        return !isAI && (index === 0 || player.user_id !== selectedPlayers[0]);
                                      })
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
                        {t('quickMatch.playerHelp')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-auto pt-0">
                    <button
                      onClick={createGame}
                      disabled={loading || !selectedPlayers[0].trim() || !selectedPlayers[1].trim()}
                      className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                        (loading || !selectedPlayers[0].trim() || !selectedPlayers[1].trim()) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Gamepad2 className="mr-2 h-5 w-5" />
                      {t('quickMatch.playNow')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Game Settings */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-700"></div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-purple-400" />
                  {t('quickMatch.settings')}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Ball Speed */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      {t('quickMatch.ballSpeed')}
                    </label>
                    <div className="flex space-x-2">
                      {options?.ballSpeed.map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setBallSpeed(speed)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            ballSpeed === speed
                              ? 'bg-blue-600 text-white'
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
                      {t('quickMatch.paddleSize')}
                    </label>
                    <div className="flex space-x-2">
                      {options?.paddleSize.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setPaddleSize(size)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            paddleSize === size
                              ? 'bg-blue-600 text-white'
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
                      {t('quickMatch.winningScore')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        min={options?.winningScore?.min || 1}
                        max={options?.winningScore?.max || 20}
                        value={winningScore}
                        onChange={handleWinningScoreChange}
                        onBlur={handleWinningScoreBlur}
                        className="w-full h-9 p-2 pl-3 pr-20 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-8 pointer-events-none">
                        <span className="text-gray-400 text-sm">{t('quickMatch.points')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acceleration Enabled */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      {t('quickMatch.acceleration')}
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setAccelerationEnabled(true)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          accelerationEnabled
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {t('quickMatch.enabled')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccelerationEnabled(false)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          !accelerationEnabled
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {t('quickMatch.disabled')}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Game explanation */}
                <div className="mt-8 bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-gray-300 text-sm">
                      {t('quickMatch.gameHelp')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Game Modal */}
      {isGameModalOpen && gameId && (
        <GameModal
          gameId={gameId}
          player1={selectedPlayers[0]}
          player2={selectedPlayers[1]}
          ballSpeed={ballSpeed}
          paddleSize={paddleSize}
          winningScore={winningScore}
          accelerationEnabled={accelerationEnabled}
          onClose={handleCloseGame}
          isTournament={false}
        />
      )}
    </div>
  );
};

export default QuickMatchPage;