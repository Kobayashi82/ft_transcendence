import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, AlertTriangle, XCircle, Trophy } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import PongGame from "../../components/game/PongGame";

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
  tournamentName?: string;
}

type GameState = 'waiting' | 'playing' | 'paused' | 'finished' | 'next' | 'cancelled';

interface Player {
  name: string | null;
  y: number;
  score: number;
  isAI?: boolean;
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
  onClose,
  tournamentRound = 1
}) => {
  const { t } = useLanguage();
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const unmountingRef = useRef(false);
  
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
  const [currentGameId, setCurrentGameId] = useState<string>(gameId);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
  const [screenSize, setScreenSize] = useState<'small' | 'medium' | 'large'>(window.innerWidth < 640 ? 'small' : window.innerWidth < 1024 ? 'medium' : 'large');

  // Update current round when game state changes
  useEffect(() => {
    if (gameState?.settings?.tournamentRound) {
      setCurrentRound(gameState.settings.tournamentRound);
    }
  }, [gameState]);

  // Detector de orientación y tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);

      let newSize: 'small' | 'medium' | 'large';
      if 		  (window.innerWidth < 640)   newSize = 'small';
      else if (window.innerWidth < 1024)  newSize = 'medium';
      else                                newSize = 'large';
      setScreenSize(newSize);
    };
    
    handleResize();
    
    // Agregar listeners para cambios de tamaño y orientación
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => { setTimeout(handleResize, 300); });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    let cleanupCalled = false;
    
    const setupWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws/pong`;
      
      // Create WebSocket connection if it doesn't exist or is closed
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        // Handle connection open
        ws.onopen = () => {
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
          ws.send(JSON.stringify(stateRequest));

          // Send ping every 30 seconds to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);   
      
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
            
            switch (message.type) {
              case "state":
                setGameState(message.data);
                if (message.data?.gameState === "next") setNextButtonEnabled(true);
                else									setNextButtonEnabled(false);
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
                // Store both IDs but use the matchId for all subsequent communications
                if (message.matchId) {
                  setCurrentGameId(message.matchId);
                  
                  // Request the state of the new game using the existing WebSocket
                  if (ws.readyState === WebSocket.OPEN) {
                    const stateRequest = { 
                      type: "state", 
                      gameId: message.matchId,
                      playerName: player1, 
                      isSpectator: false
                    };
                    ws.send(JSON.stringify(stateRequest));
                  }
                }
                break;
              case "tournament_completed":
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
                setError(message.message);
                break;            
            }
          } catch (err) {}
        };
        
        // Handle connection close
        ws.onclose = (event) => {
          setIsConnected(false);
          
          if (event.code === 1006) {           
            setConnectionLost(true);
            connectionLostTimeoutRef.current = window.setTimeout(() => { setPersistentConnectionLost(true); }, 5000);
          }
        };
        ws.onerror = (_) => setConnectionLost(true);
      } else if (wsRef.current.readyState === WebSocket.OPEN) {
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
    
    // When currentGameId changes update the state request with the new gameId
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !cleanupCalled) {
      const stateRequest = { 
        type: "state", 
        gameId: currentGameId,
        playerName: player1, 
        isSpectator: false
      };
      wsRef.current.send(JSON.stringify(stateRequest));
    }
    
    // Cleanup function when component unmounts or gameId changes
    return () => {
      cleanupCalled = true;
      
      if (connectionLostTimeoutRef.current) {
        clearTimeout(connectionLostTimeoutRef.current);
        connectionLostTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [currentGameId, player1, player2]);

  // Final cleanup when component is completely unmounted
  useEffect(() => {
    return () => {
      // This executes when the entire component is unmounted (not just during round transitions)
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
        try {
          wsRef.current.send(JSON.stringify({
            type: "cancel",
            gameId: currentGameId
          }));
          wsRef.current.close(1000, "Component unmounted");
        } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []);

  // Start
  const startGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const startMessage = {
        type: "start",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(startMessage));
    }
  };

  // Next round in tournament
  const handleNextRound = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const nextMessage = {
        type: "next",
        gameId: currentGameId
      };
      wsRef.current.send(JSON.stringify(nextMessage));
    }
  };

  // Pause/Resume
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
      onClose();
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
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
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (gameState && ((player === 1 && gameState.player1.isAI) || (player === 2 && gameState.player2.isAI))) return;
    
    const moveMessage = {
      type: "move",
      gameId: currentGameId,
      player,
      direction
    };
    wsRef.current.send(JSON.stringify(moveMessage));
  };

  // Handle paddle position
  const handleSetPosition = (y: number, player: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (gameState && ((player === 1 && gameState.player1.isAI) || (player === 2 && gameState.player2.isAI))) return;
    
    const positionMessage = {
      type: "position",
      gameId: currentGameId,
      player,
      y
    };
    wsRef.current.send(JSON.stringify(positionMessage));
  };
  
  // Handle keyboard events
  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (gameState?.gameState === "paused" || gameState?.gameState === "playing")) {
        e.preventDefault();
        togglePause();
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if      (gameState?.gameState === "waiting")  startGame();
		else if (gameState?.gameState === "next")     handleNextRound();
        else if (gameState?.gameState === "paused")   togglePause();
        else if (gameState?.gameState === "playing")  togglePause();
      }
      
      if (gameState?.gameState !== "playing") return;
      
      if      (e.key === "w" || e.key === "W") { e.preventDefault(); handleMove("up", 1);   }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); handleMove("down", 1); }
      
      if      (e.key === "ArrowUp")   { e.preventDefault(); handleMove("up", 2);   }
      else if (e.key === "ArrowDown") { e.preventDefault(); handleMove("down", 2); }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState?.gameState !== "playing") return;
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") { e.preventDefault(); handleMove("stop", 1); }
      if (e.key === "ArrowUp" || e.key === "ArrowDown")                     { e.preventDefault(); handleMove("stop", 2); }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);
  
  // Prevent page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState && ["waiting", "playing", "paused", "next"].includes(gameState.gameState)) {
        e.preventDefault();
        e.returnValue = ""; 
        return ""; 
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); };
  }, [gameState]);
  
  // Handle closing the modal
  const handleCloseClick = () => {
    if (persistentConnectionLost) { onClose(); return; }

    const isTournamentCompleted = gameState?.settings?.tournamentMode && currentRound === 2 && gameState.gameState === "next";
    if (isTournamentCompleted || (gameState && ["finished", "cancelled"].includes(gameState.gameState))) { onClose(); return; }
    
    if (gameState && ["waiting", "playing", "paused", "next"].includes(gameState.gameState)) {
      if (gameState?.gameState === "playing") togglePause();
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };
  
  useEffect(() => {
    if (persistentConnectionLost) {
      const timer = setTimeout(() => { onClose(); }, 15000);
      return () => clearTimeout(timer);
    }
  }, [persistentConnectionLost, onClose]);
  
  const getScoreText = () => {
    if (!gameState) return "";  
    return `${gameState.player1.score} - ${gameState.player2.score}`;
  };
  
  const canStartGame = () => { return gameState && !showNextRoundButton() && (gameState.gameState === "waiting" || gameState.gameState === "next") && gameState.player1.name && gameState.player2.name && !persistentConnectionLost; }; 
  const canPauseGame = () => { return gameState && (gameState.gameState === "playing" || gameState.gameState === "paused") && !persistentConnectionLost; };
  const showNextRoundButton = () => { return gameState && gameState.gameState === "next" && gameState.settings?.tournamentMode && !persistentConnectionLost; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-2 sm:p-4">
      <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl w-full ${screenSize === 'small' ? 'max-w-full' : 'max-w-5xl'}`}>
        <div className={`bg-gray-900 px-3 sm:px-6 py-2 sm:py-4 flex justify-between items-center border-b border-gray-700 ${screenSize === 'small' ? 'flex-col' : 'flex-row'}`}>
          <div className={`${screenSize === 'small' ? 'w-full text-center mb-2' : ''}`}>
            <h3 className={`${screenSize === 'small' ? 'text-lg' : 'text-xl'} font-bold text-white flex items-center ${screenSize === 'small' ? 'justify-center' : ''}`}>
              {gameState?.settings?.tournamentMode && (
                <Trophy className={`${screenSize === 'small' ? 'h-4 w-4' : 'h-5 w-5'} text-amber-400 mr-2`} />
              )}
              {screenSize === 'small' ? (
                <>
                  <span className="truncate max-w-[100px]">{gameState?.player1?.name || player1}</span> 
                  <span className="mx-1">🆚</span> 
                  <span className="truncate max-w-[100px]">{gameState?.player2?.name || player2 || t('quickMatch.waiting')}</span>
                </>
              ) : (
                <>
                  {gameState?.player1?.name || player1} 🆚 {gameState?.player2?.name || player2 || t('quickMatch.waiting')}
                </>
              )}
            </h3>
            <p className="text-gray-400 text-sm flex items-center justify-center sm:justify-start">
              {!isConnected && <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>}
              {/* {getStatusText()} */}
            </p>
          </div>
          
          <div className={`flex items-center ${screenSize === 'small' ? 'w-full justify-between' : 'space-x-4'}`}>
            {gameState && (
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <span className={`${screenSize === 'small' ? 'text-lg' : 'text-xl'} font-bold text-white`}>{getScoreText()}</span>
              </div>
            )}
            
            <div className="flex space-x-2">
              {canStartGame() && (
                <button
                  onClick={gameState?.gameState === "next" ? handleNextRound : startGame}
                  className={`${gameState?.gameState === "next" ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"} text-white p-2 rounded-lg`}
                  title={t('quickMatch.startGame')}
                >
                  <Play className={`${screenSize === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </button>
              )}
              
              {canPauseGame() && (
                <button
                  onClick={togglePause}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                  title={gameState?.gameState === "paused" ? t('quickMatch.resume') : t('quickMatch.pause')}
                >
                  {gameState?.gameState === "paused" ? (
                    <Play className={`${screenSize === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  ) : (
                    <Pause className={`${screenSize === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  )}
                </button>
              )}
              
              <button
                onClick={handleCloseClick}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                title={t('quickMatch.close')}
              >
                <X className={`${screenSize === 'small' ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </button>
            </div>
          </div>
        </div>
        
        {persistentConnectionLost && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-3 py-2 sm:px-4 sm:py-3 m-2 sm:m-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-300 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('quickMatch.connectionLostTitle')}</p>
                <p className={`${screenSize === 'small' ? 'text-sm' : ''}`}>{t('quickMatch.connectionLostMessage')}</p>
                <button 
                  onClick={onClose}
                  className="mt-2 sm:mt-3 px-3 py-1 sm:px-4 sm:py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm sm:text-base"
                >
                  {t('quickMatch.returnToMenu')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showNextRoundButton() && (
          <div className="bg-purple-900/40 border border-purple-500/50 text-purple-100 px-3 py-2 sm:px-4 sm:py-3 m-2 sm:m-4 rounded-lg">
            <div className="flex">
              <Trophy className="h-5 w-5 text-purple-300 mr-2 flex-shrink-0" />
              <div>
                <p className={`${screenSize === 'small' ? 'text-sm' : ''}`}>
                  {currentRound === 1 ? 
                    (gameState && gameState.settings?.isSecondSemifinal ? 
                      t('tournament.secondSemifinalCompleted') : 
                      t('tournament.firstSemifinalCompleted')) : 
                    t('tournament.finalCompleted')}
                </p>
                {currentRound === 1 ? (
                  <button 
                    onClick={handleNextRound}
                    className="mt-2 sm:mt-3 px-3 py-1 sm:px-4 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm sm:text-base"
                  >
                    {gameState?.settings?.isSecondSemifinal ? 
                      t('tournament.proceedToFinal') : 
                      t('tournament.proceedToSecondSemifinal')}
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="mt-2 sm:mt-3 px-3 py-1 sm:px-4 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm sm:text-base"
                  >
                    {t('tournament.closeTournament')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {error && !persistentConnectionLost && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-3 py-2 sm:px-4 sm:py-3 m-2 sm:m-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-300 mr-2 flex-shrink-0" />
              <p className={`${screenSize === 'small' ? 'text-sm' : ''}`}>{error}</p>
            </div>
          </div>
        )}
        
        <div 
          className="relative w-full overflow-hidden"
          style={{ 
            aspectRatio: orientation === 'portrait' ? '4/3' : '3/2',
            maxHeight: orientation === 'portrait' ? '70vh' : '80vh',
          }}
        >
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
                  <p className={`${screenSize === 'small' ? 'text-base' : 'text-lg'} text-gray-300`}>{t('quickMatch.connectionLostMessage')}</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className={`bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6 ${screenSize === 'small' ? 'w-[90%]' : 'max-w-md'}`}>
            <div className="flex items-center mb-3 sm:mb-4">
              <XCircle className={`${screenSize === 'small' ? 'h-5 w-5' : 'h-6 w-6'} text-red-500 mr-2 sm:mr-3`} />
              <h3 className={`${screenSize === 'small' ? 'text-lg' : 'text-xl'} font-bold text-white`}>{t('quickMatch.confirmCancel')}</h3>
            </div>
            <p className={`text-gray-300 mb-4 sm:mb-6 ${screenSize === 'small' ? 'text-sm' : ''}`}>
              {gameState?.settings?.tournamentMode 
                ? t('tournament.confirmCancelText') 
                : t('quickMatch.confirmCancelText')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className={`px-3 py-1 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg ${screenSize === 'small' ? 'text-sm' : ''}`}
              >
                {t('quickMatch.stay')}
              </button>
              <button
                onClick={cancelGame}
                className={`px-3 py-1 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg ${screenSize === 'small' ? 'text-sm' : ''}`}
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