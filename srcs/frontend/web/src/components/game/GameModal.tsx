import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, AlertTriangle, XCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import PongGame from "../../components/game/PongGame";

// Actualiza la interfaz para incluir todas las propiedades que están siendo pasadas
interface GameModalProps {
  gameId: string;
  player1: string;
  player2: string;
  ballSpeed?: string;
  paddleSize?: string;
  winningScore?: number;
  accelerationEnabled?: boolean;
  onClose: () => void;
}

// Game state types
type GameState = 'waiting' | 'playing' | 'paused' | 'finished' | 'cancelled';

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
  // El backend ya recibe estos valores durante la creación del juego,
  // así que son opcionales aquí y no los usamos directamente
  ballSpeed,
  paddleSize,
  winningScore,
  accelerationEnabled,
  onClose 
}) => {
  const { t } = useLanguage();
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  
  // State
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [connectionLost, setConnectionLost] = useState<boolean>(false);
  const [persistentConnectionLost, setPersistentConnectionLost] = useState<boolean>(false);
  const connectionLostTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws/pong`;

    // Create WebSocket connection
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
        gameId: gameId,
        playerName: player1 // Identify which player this client represents
      };
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
          case "pong":
            break;
          case "error":
            console.error("Error message received:", message);
            //setError(message.message);
            break;            
          default:
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
        
        // Marcar la conexión como perdida temporalmente 
        setConnectionLost(true);
        
        // Si la desconexión persiste por más de 5 segundos, marcarla como permanente
        connectionLostTimeoutRef.current = window.setTimeout(() => {
          setPersistentConnectionLost(true);
        }, 5000); 
      }
    };
    
    // Handle connection error
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      //setError("WebSocket connection error. Check your network connection and try again.");
      setConnectionLost(true);
    };

    // Cleanup function when component unmounts
    return () => {
      console.log("Component unmounted, cleaning up WebSocket connection");
      
      // Limpiar timeout de conexión perdida
      if (connectionLostTimeoutRef.current) {
        clearTimeout(connectionLostTimeoutRef.current);
        connectionLostTimeoutRef.current = null;
      }
      
      // Limpiar ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (wsRef.current) {
        console.log("Closing WebSocket connection");
        try {
          // Send cancel message before closing to ensure proper cleanup
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "cancel",
              gameId
            }));
          }
          wsRef.current.close(1000, "Component unmounted");
        } catch (e) {
          console.error("Error closing WebSocket:", e);
        }
        wsRef.current = null;
      }
    };
  }, [gameId, player1, player2]);

  // Start the game
  const startGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const startMessage = {
        type: "start",
        gameId
      };
      wsRef.current.send(JSON.stringify(startMessage));
    }
  };

  // Pause/Resume the game
  const togglePause = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const isPaused = gameState?.gameState === "paused";
      const toggleMessage = {
        type: isPaused ? "resume" : "pause",
        gameId
      };
      wsRef.current.send(JSON.stringify(toggleMessage));
    }
  };

  // Cancel the game
  const cancelGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const cancelMessage = {
        type: "cancel",
        gameId
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
        gameId,
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
        gameId,
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
      
      // Player 1 controls (W, S keys)
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleMove("up", 1);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleMove("down", 1);
      }
      
      // Player 2 controls (Arrow keys)
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
      
      // Player 1 controls (W, S keys)
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleMove("stop", 1);
      }
      
      // Player 2 controls (Arrow keys)
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        handleMove("stop", 2);
      }
    };
    
    // Add event listeners
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
      if (gameState && ["waiting", "playing", "paused"].includes(gameState.gameState)) {
        e.preventDefault();
        e.returnValue = ""; // This is required for Chrome
        return ""; // This is required for other browsers
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gameState]);
  
  // Handle closing the modal
  const handleCloseClick = () => {
    // Si la conexión se perdió permanentemente, permitir cerrar sin confirmación
    if (persistentConnectionLost) {
      onClose();
      return;
    }
    
    // If game is in progress, show confirmation dialog
    if (gameState && ["waiting", "playing", "paused"].includes(gameState.gameState)) {
      if (gameState?.gameState === "playing") togglePause();
      setShowExitConfirm(true);
    } else {
      // If game is already finished or cancelled, just close it
      onClose();
    }
  };
  
  // Handle connection loss - cerrar después de 15 segundos de pérdida de conexión persistente
  useEffect(() => {
    if (persistentConnectionLost) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [persistentConnectionLost, onClose]);
  
  // Render game status text
  const getStatusText = () => {
    if (persistentConnectionLost) return t('quickMatch.connectionLost');
    if (!gameState) return t('quickMatch.connecting');
    
    switch (gameState.gameState) {
      case "waiting":
        return t('quickMatch.waiting');
      case "playing":
        return t('quickMatch.inProgress');
      case "paused":
        return t('quickMatch.paused');
      case "finished":
        const winner = gameState.player1.score > gameState.player2.score 
          ? gameState.player1.name 
          : gameState.player2.name;
        return `${winner} ${t('quickMatch.wins')}`;
      case "cancelled":
        return t('quickMatch.cancelled');
      default:
        return "Unknown state";
    }
  };
  
  // Render score
  const getScoreText = () => {
    if (!gameState) return "";
    
    return `${gameState.player1.score} - ${gameState.player2.score}`;
  };
  
  // Determine if the game can be started
  const canStartGame = () => {
    return gameState && 
           gameState.gameState === "waiting" && 
           gameState.player1.name && 
           gameState.player2.name &&
           !persistentConnectionLost;
  };
  
  // Determine if the game can be paused/resumed
  const canPauseGame = () => {
    return gameState && 
           (gameState.gameState === "playing" || gameState.gameState === "paused") &&
           !persistentConnectionLost;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl w-full max-w-5xl">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-white">
              {player1} 🆚 {player2 || t('quickMatch.waiting')}
            </h3>
            <p className="text-gray-400 text-sm flex items-center">
              {!isConnected && <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>}
              {getStatusText()}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Score display */}
            {gameState && (
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-xl font-bold text-white">{getScoreText()}</span>
              </div>
            )}
            
            {/* Game controls */}
            <div className="flex space-x-2">
              {canStartGame() && (
                <button
                  onClick={startGame}
                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
                  title={t('quickMatch.startGame')}
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
        
        {/* Connection lost message - solo mostrar si la pérdida es persistente */}
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
        
        {/* Error display */}
        {error && !persistentConnectionLost && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-100 px-4 py-3 m-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-300 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {/* Game canvas */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2" }}>
          {gameState ? (
            <PongGame
              gameState={gameState}
              playerNumber={1} // Default to player 1
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
      
      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md">
            <div className="flex items-center mb-4">
              <XCircle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-xl font-bold text-white">{t('quickMatch.confirmCancel')}</h3>
            </div>
            <p className="text-gray-300 mb-6">
              {t('quickMatch.confirmCancelText')}
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