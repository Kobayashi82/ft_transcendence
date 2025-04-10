import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, AlertTriangle, XCircle, Trophy } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import PongGame from "../../components/game/PongGame";

// Update interface to include tournament props
interface GameModalProps {
  gameId: string;
  player1: string;
  player2: string;
  ballSpeed?: string;
  paddleSize?: string;
  winningScore?: number;
  accelerationEnabled?: boolean;
  onClose: () => void;
  isTournament?: boolean;
  tournamentRound?: number;
}

// Game state types
type GameState = 'waiting' | 'playing' | 'paused' | 'finished' | 'next' | 'cancelled';

interface Player {
  name: string | null;
  y: number;
  score: number;
}

interface Ball {
  x: number;
  y: number;
}

interface GameConfig {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  ballSize: number;
  winningScore: number;
}

interface GameSettings {
  ballSpeed: string;
  accelerationEnabled: boolean;
  paddleSize: string;
  tournamentMode: boolean;
  tournamentRound: number;
  isSecondSemifinal?: boolean;
}

interface GameStateData {
  gameState: GameState;
  player1: Player;
  player2: Player;
  ball: Ball;
  config: GameConfig;
  settings: GameSettings;
}

// WebSocket message types
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const GameModal: React.FC<GameModalProps> = ({ 
  gameId,
  player1,
  player2,
  ballSpeed,
  paddleSize,
  winningScore,
  accelerationEnabled,
  onClose,
  isTournament = false,
  tournamentRound = 1
}) => {
  const { t } = useLanguage();
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const unmountingRef = useRef(false); // Add an unmounting flag to track component unmounts vs round transitions
  
  // State
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [connectionLost, setConnectionLost] = useState<boolean>(false);
  const [persistentConnectionLost, setPersistentConnectionLost] = useState<boolean>(false);
  const connectionLostTimeoutRef = useRef<number | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(tournamentRound);
  const [nextButtonEnabled, setNextButtonEnabled] = useState<boolean>(false);
  const [currentGameId, setCurrentGameId] = useState<string>(gameId); // Track the current game ID

  // Update current round when game state changes
  useEffect(() => {
    if (gameState?.settings?.tournamentRound) {
      setCurrentRound(gameState.settings.tournamentRound);
    }
  }, [gameState]);

  // Setup WebSocket connection
  useEffect(() => {
    let cleanupCalled = false;
    
    const setupWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws/pong`;
      
      console.log(`Setting up WebSocket connection for gameId: ${currentGameId}`);
      
      // Create WebSocket connection if it doesn't exist or is closed
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        // Handle connection open
        ws.onopen = () => {
          console.log("WebSocket connection established");
          setIsConnected(true);
          setError(null);
          setConnectionLost(false);
          setPersistentConnectionLost(false);
          
          // Cancelar cualquier timeout de conexión perdida
          if (connectionLostTimeoutRef.current) {
            clearTimeout(connectionLostTimeoutRef.current);
            connectionLostTimeoutRef.current = null;
          }

          // Request the current game state with player name
          const stateRequest = { 
            type: "state", 
            gameId: currentGameId,
            playerName: player1, 
            isSpectator: false
          };
          console.log(`Requesting state for gameId: ${currentGameId}`);
          ws.send(JSON.stringify(stateRequest));

          // Send ping every 30 seconds to keep connection alive
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            } else {
              if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
              }
            }
          }, 30000);
        };
        
        // Handle messages from server
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            console.log("Message received:", message);
            
            switch (message.type) {
              case "state":
                setGameState(message.data);
                if (message.data?.gameState === "next") {
                  setNextButtonEnabled(true);
                } else {
                  setNextButtonEnabled(false);
                }
                break;            
              case "started":
                setGameState(message.gameState);
                break;            
              case "paused":
                setGameState(message.gameState);
                break;            
              case "resumed":
                setGameState(message.gameState);
                break;            
              case "cancelled":
                setGameState(message.gameState);
                break;
              case "next_match":
                console.log("Moving to next match:", message);
                
                // Store both IDs but use the matchId for all subsequent communications
                if (message.matchId) {
                  console.log(`Updating currentGameId from ${currentGameId} to ${message.matchId}`);
                  setCurrentGameId(message.matchId);
                  
                  // Request the state of the new game using the existing WebSocket
                  if (ws.readyState === WebSocket.OPEN) {
                    const stateRequest = { 
                      type: "state", 
                      gameId: message.matchId,
                      playerName: player1, 
                      isSpectator: false
                    };
                    console.log("Requesting state for new match:", stateRequest);
                    ws.send(JSON.stringify(stateRequest));
                  }
                }
                break;
              case "tournament_completed":
                console.log("Tournament completed:", message);
                setGameState(prev => prev ? { 
                  ...prev, 
                  gameState: "finished",
                  settings: {
                    ...prev.settings,
                    tournamentMode: false
                  }
                } : null);
                break;                
              case "pong":
                break;
              case "error":
                console.error("Error message received:", message);
                setError(message.message);
                break;            
              default:
                console.log("Unknown message type:", message.type);
            }
          } catch (err) {
            console.error("Error processing message:", err);
          }
        };
        
        // Handle connection close
        ws.onclose = (event) => {
          console.log("WebSocket connection closed", event);
          setIsConnected(false);
          
          if (event.code === 1006) {
            console.error("Abnormal closure - the server closed the connection unexpectedly");
            
            setConnectionLost(true);
            
            connectionLostTimeoutRef.current = window.setTimeout(() => {
              setPersistentConnectionLost(true);
            }, 5000); 
          }
        };
        
        // Handle connection error
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnectionLost(true);
        };
      } else if (wsRef.current.readyState === WebSocket.OPEN) {
        // If WebSocket is already open, just request the current state
        console.log(`WebSocket already open, requesting state for gameId: ${currentGameId}`);
        const stateRequest = { 
          type: "state", 
          gameId: currentGameId,
          playerName: player1, 
          isSpectator: false
        };
        wsRef.current.send(JSON.stringify(stateRequest));
      }
    };
    
    setupWebSocket();
    
    // When currentGameId changes, don't recreate the WebSocket,
    // just update the state request with the new gameId
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !cleanupCalled) {
      const stateRequest = { 
        type: "state", 
        gameId: currentGameId,
        playerName: player1, 
        isSpectator: false
      };
      console.log(`GameId changed, requesting state for: ${currentGameId}`);
      wsRef.current.send(JSON.stringify(stateRequest));
    }
    
    // Cleanup function when component unmounts or gameId changes
    return () => {
      cleanupCalled = true;
      console.log(`Cleanup for gameId: ${currentGameId}`);
      
      if (connectionLostTimeoutRef.current) {
        clearTimeout(connectionLostTimeoutRef.current);
        connectionLostTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // We don't close the WebSocket here anymore since we want to reuse it
      // for the next game in the tournament sequence. It will be closed
      // when the component unmounts completely.
    };
  }, [currentGameId, player1, player2]);

  // Final cleanup when component is completely unmounted
  useEffect(() => {
    return () => {
      // This executes when the entire component is unmounted (not just during round transitions)
      console.log("GameModal component is completely unmounting");
      unmountingRef.current = true;
      
      if (connectionLostTimeoutRef.current) {
        clearTimeout(connectionLostTimeoutRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Only cancel the game if we're truly unmounting the whole component
      // not just transitioning between rounds
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log(`Closing WebSocket and cancelling game: ${currentGameId}`);
        try {
          wsRef.current.send(JSON.stringify({
            type: "cancel",
            gameId: currentGameId
          }));
          wsRef.current.close(1000, "Component unmounted");
        } catch (e) {
          console.error("Error closing WebSocket:", e);
        }
        wsRef.current = null;
      }
    };
  }, []);

  // Start the game
  const startGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const startMessage = {
        type: "start",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(startMessage));
    }
  };

  // Handle next round in tournament mode
  const handleNextRound = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const nextMessage = {
        type: "next",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(nextMessage));
    }
  };

  // Pause/Resume the game
  const togglePause = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const isPaused = gameState?.gameState === "paused";
      const toggleMessage = {
        type: isPaused ? "resume" : "pause",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(toggleMessage));
    }
  };

  // Cancel the game
  const cancelGame = () => {
    // Don't cancel if we're in the middle of a tournament round transition
    if (gameState?.settings?.tournamentMode && gameState?.gameState === 'next') {
      console.log('Attempting to close during tournament round transition - skipping cancel');
      onClose();
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log(`Sending cancel message for gameId: ${currentGameId}`);
      const cancelMessage = {
        type: "cancel",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(cancelMessage));
    }
    onClose();
  };

  // Handle paddle movement
  const handleMove = (direction: 'up' | 'down' | 'stop', player: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const moveMessage = {
        type: "move",
        gameId: currentGameId,
        player,
        direction
      };
      wsRef.current.send(JSON.stringify(moveMessage));
    }
  };

  // Handle paddle position update
  const handleSetPosition = (y: number, player: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const positionMessage = {
        type: "position",
        gameId: currentGameId,
        player,
        y
      };
      wsRef.current.send(JSON.stringify(positionMessage));
    }
  };
  
  // Handle keyboard events for controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (gameState?.gameState === "paused" || gameState?.gameState === "playing")) {
        e.preventDefault();
        togglePause();
      }
      
      if (gameState?.gameState !== "playing") return;
      
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleMove("up", 1);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleMove("down", 1);
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleMove("up", 2);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleMove("down", 2);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState?.gameState !== "playing") return;
      
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleMove("stop", 1);
      }
      
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        handleMove("stop", 2);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);
  
  // Prevent page unload/navigation when game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState && ["waiting", "playing", "paused", "next"].includes(gameState.gameState)) {
        e.preventDefault();
        e.returnValue = ""; 
        return ""; 
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gameState]);
  
  // Handle closing the modal
  const handleCloseClick = () => {
    if (persistentConnectionLost) {
      onClose();
      return;
    }
    
    if (gameState && ["waiting", "playing", "paused", "next"].includes(gameState.gameState)) {
      if (gameState?.gameState === "playing") togglePause();
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };
  
  useEffect(() => {
    if (persistentConnectionLost) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [persistentConnectionLost, onClose]);
  
  const getStatusText = () => {
    if (persistentConnectionLost) return t('quickMatch.connectionLost');
    if (!gameState) return t('quickMatch.connecting');
    
    const isTournamentMode = gameState.settings?.tournamentMode;
    const round = gameState.settings?.tournamentRound || 1;
    const tournamentPrefix = isTournamentMode ? 
      (round === 2 ? `${t('tournament.final')}: ` : `${t('tournament.round')} ${round}: `) : '';
    
    switch (gameState.gameState) {
      case "waiting":
        return `${tournamentPrefix}${t('quickMatch.waiting')}`;
      case "playing":
        return `${tournamentPrefix}${t('quickMatch.inProgress')}`;
      case "paused":
        return `${tournamentPrefix}${t('quickMatch.paused')}`;
      case "next":
        return `${tournamentPrefix}${t('tournament.roundCompleted')}`;
      case "finished":
        const winner = gameState.player1.score > gameState.player2.score 
          ? gameState.player1.name 
          : gameState.player2.name;
        return `${tournamentPrefix}${winner} ${t('quickMatch.wins')}`;
      case "cancelled":
        return `${tournamentPrefix}${t('quickMatch.cancelled')}`;
      default:
        return "Unknown state";
    }
  };
  
  const getScoreText = () => {
    if (!gameState) return "";
    
    return `${gameState.player1.score} - ${gameState.player2.score}`;
  };
  
  const canStartGame = () => {
    // No mostrar el botón de inicio cuando hay un botón de "Proceed" visible
    return gameState && 
           !showNextRoundButton() &&  // No mostrar si ya hay un botón "Proceed"
           (gameState.gameState === "waiting" || gameState.gameState === "next") && 
           gameState.player1.name && 
           gameState.player2.name &&
           !persistentConnectionLost;
  };
  
  const canPauseGame = () => {
    return gameState && 
           (gameState.gameState === "playing" || gameState.gameState === "paused") &&
           !persistentConnectionLost;
  };

  const showNextRoundButton = () => {
    return gameState && 
           gameState.gameState === "next" && 
           gameState.settings?.tournamentMode && 
           !persistentConnectionLost;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl w-full max-w-5xl">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center">
              {gameState?.settings?.tournamentMode && (
                <Trophy className="h-5 w-5 text-amber-400 mr-2" />
              )}
              {gameState?.player1?.name || player1} 🆚 {gameState?.player2?.name || player2 || t('quickMatch.waiting')}
            </h3>
            <p className="text-gray-400 text-sm flex items-center">
              {!isConnected && <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>}
              {getStatusText()}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {gameState && (
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-xl font-bold text-white">{getScoreText()}</span>
              </div>
            )}
            
            <div className="flex space-x-2">
              {canStartGame() && (
                <button
                  onClick={gameState?.gameState === "next" ? handleNextRound : startGame}
                  className={`${gameState?.gameState === "next" ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"} text-white p-2 rounded-lg`}
                  title={gameState?.gameState === "next" ? t('tournament.nextRound') : t('quickMatch.startGame')}
                >
                  <Play className="h-5 w-5" />
                </button>
              )}
              
              {canPauseGame() && (
                <button
                  onClick={togglePause}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                  title={gameState?.gameState === "paused" ? t('quickMatch.resume') : t('quickMatch.pause')}
                >
                  {gameState?.gameState === "paused" ? (
                    <Play className="h-5 w-5" />
                  ) : (
                    <Pause className="h-5 w-5" />
                  )}
                </button>
              )}
              
              <button
                onClick={handleCloseClick}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                title={t('quickMatch.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {persistentConnectionLost && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-4 py-3 m-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-300 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('quickMatch.connectionLostTitle')}</p>
                <p>{t('quickMatch.connectionLostMessage')}</p>
                <button 
                  onClick={onClose}
                  className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg"
                >
                  {t('quickMatch.returnToMenu')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showNextRoundButton() && (
          <div className="bg-purple-900/40 border border-purple-500/50 text-purple-100 px-4 py-3 m-4 rounded-lg">
            <div className="flex">
              <Trophy className="h-5 w-5 text-purple-300 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('tournament.roundCompletedTitle')}</p>
                <p>
                  {currentRound === 1 ? 
                    (gameState && gameState.settings?.isSecondSemifinal ? 
                      t('tournament.secondSemifinalCompleted') : 
                      t('tournament.firstSemifinalCompleted')) : 
                    t('tournament.finalCompleted')}
                </p>
                {currentRound === 1 ? (
                  <button 
                    onClick={handleNextRound}
                    className="mt-3 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg"
                  >
                    {gameState?.settings?.isSecondSemifinal ? 
                      t('tournament.proceedToFinal') : 
                      t('tournament.proceedToSecondSemifinal')}
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="mt-3 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg"
                  >
                    {t('tournament.closeTournament')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {error && !persistentConnectionLost && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-4 py-3 m-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-300 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}
        
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2" }}>
          {gameState ? (
            <PongGame
              gameState={gameState}
              playerNumber={1} 
              onMove={handleMove}
              onSetPosition={handleSetPosition}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900">
              {persistentConnectionLost ? (
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg text-gray-300">{t('quickMatch.connectionLostMessage')}</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md">
            <div className="flex items-center mb-4">
              <XCircle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-xl font-bold text-white">{t('quickMatch.confirmCancel')}</h3>
            </div>
            <p className="text-gray-300 mb-6">
              {gameState?.settings?.tournamentMode 
                ? t('tournament.confirmCancelText') 
                : t('quickMatch.confirmCancelText')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                {t('quickMatch.stay')}
              </button>
              <button
                onClick={cancelGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {t('quickMatch.leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameModal;