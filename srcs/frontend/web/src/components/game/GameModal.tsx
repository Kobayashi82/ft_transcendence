import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, AlertTriangle, XCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import PongGame from "../../components/game/PongGame";

interface GameModalProps {
  gameId: string;
  player1: string;
  player2: string;
  ballSpeed: string;
  paddleSize: string;
  winningScore: number;
  accelerationEnabled: boolean;
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
  paddleHeight: number;
  paddleWidth: number;
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
  ballSpeed, 
  paddleSize, 
  winningScore, 
  accelerationEnabled, 
  onClose 
}) => {
  const { t } = useLanguage();
  const wsRef = useRef<WebSocket | null>(null);
  
  // State
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerNumber, setPlayerNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  useEffect(() => {
	const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/game/ws/pong`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    
    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    // Handle connection open
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      setError(null);
      
      // Request the current game state
      const stateRequest = { type: "state", gameId: gameId };
      ws.send(JSON.stringify(stateRequest));
      
      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      return () => clearInterval(pingInterval);
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
		  case "cancel":
			setGameState(message.gameState);
			break;				
          case "pong":
            break;
          case "error":
            console.error("Error message received:", message);
            setError(message.message);
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
        setError("Could not establish connection to game server. Please try again later.");
      }
    };
    
    // Handle connection error
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket connection error. Check your network connection and try again.");
    };

    // Cleanup function when component unmounts
    return () => {
      console.log("Component unmounted, cleaning up WebSocket connection");
      
      if (wsRef.current) {
        console.log("Closing WebSocket connection");
        try {
          wsRef.current.close(1000, "Component unmounted");
        } catch (e) {
          console.error("Error closing WebSocket:", e);
        }
        wsRef.current = null;
      }
    };
  }, [gameId]);

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
  const handleMove = (direction: 'up' | 'down' | 'stop') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const moveMessage = {
        type: "move",
        gameId,
        player: playerNumber,
        direction
      };
      wsRef.current.send(JSON.stringify(moveMessage));
    }
  };

  // Handle paddle position update
  const handleSetPosition = (y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const positionMessage = {
        type: "position",
        gameId,
        player: playerNumber,
        y
      };
      wsRef.current.send(JSON.stringify(positionMessage));
    }
  };
  
  // Handle keyboard events for controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events if the game is in playing state
      if (gameState?.gameState !== "playing") return;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleMove("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleMove("down");
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Only handle keyboard events if the game is in playing state
      if (gameState?.gameState !== "playing") return;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
        case "ArrowDown":
        case "s":
        case "S":
          handleMove("stop");
          break;
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
    // If game is in progress, show confirmation dialog
    if (gameState && ["waiting", "playing", "paused"].includes(gameState.gameState)) {
      setShowExitConfirm(true);
    } else {
      // If game is already finished or cancelled, just close it
      onClose();
    }
  };
  
  // Render game status text
  const getStatusText = () => {
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
           gameState.player2.name;
  };
  
  // Determine if the game can be paused/resumed
  const canPauseGame = () => {
    return gameState && 
           (gameState.gameState === "playing" || gameState.gameState === "paused");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl w-full max-w-5xl">
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-white">
              {player1} vs. {player2 || t('quickMatch.waiting')}
            </h3>
            <p className="text-gray-400 text-sm">{getStatusText()}</p>
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
        
        {/* Error display */}
        {error && (
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
              playerNumber={playerNumber}
              onMove={handleMove}
              onSetPosition={handleSetPosition}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {/* Controls help */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Use <span className="bg-gray-800 px-2 py-1 rounded text-white">W</span> / 
            <span className="bg-gray-800 px-2 py-1 rounded text-white">↑</span> to move up, 
            <span className="bg-gray-800 px-2 py-1 rounded text-white">S</span> / 
            <span className="bg-gray-800 px-2 py-1 rounded text-white">↓</span> to move down.
            You can also click or touch the screen to move the paddle.
          </p>
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