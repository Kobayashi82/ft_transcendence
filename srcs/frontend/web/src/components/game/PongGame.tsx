import React, { useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

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

interface PongGameProps {
  gameState: GameStateData;
  playerNumber: number;
  onMove: (direction: 'up' | 'down' | 'stop', player?: number) => void;
  onSetPosition: (y: number, player?: number) => void;
}

const PongGame: React.FC<PongGameProps> = ({ gameState, playerNumber, onMove, onSetPosition }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mouseIsDownRef = useRef<boolean>(false);
  const lastRenderedStateRef = useRef<GameStateData | null>(null);
  
  // Referencias para el control táctil
  const touchTargetsRef = useRef<{[key: number]: number}>({});
  
  // Colors
  const colors = {
    background: "#1f2937",  // Dark blue-gray
    border: "rgba(255, 255, 255, 0.2)",
    net: "rgba(255, 255, 255, 0.2)",
    paddle: "#6366f1", // Indigo
    ball: "#ffffff",
    score: "rgba(255, 255, 255, 0.7)",
    scoreHighlight: "#6366f1", // Indigo
    activePlayer: "#60a5fa", // Lighter blue for active player's paddle
  };
  
  // Draw function
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Update the last rendered state
    lastRenderedStateRef.current = { ...gameState };
    
    const { config, player1, player2, ball } = gameState;
    
    // Calc scaler for canvas/game dimensions
    const scaleX = canvas.width / config.width;
    const scaleY = canvas.height / config.height;

    // Scale game dimensions to canvas size
    const scaledBall = {
      x: ball.x * scaleX,
      y: ball.y * scaleY,
      size: config.ballSize * Math.min(scaleX, scaleY)
    };
    
    const scaledPaddle1 = {
      x: config.paddleWidth * scaleX, // Left paddle x position scaled
      y: player1.y * scaleY,
      width: config.paddleWidth * scaleX,
      height: config.paddleHeight * scaleY
    };
    
    const scaledPaddle2 = {
      x: canvas.width - (config.paddleWidth * scaleX),
      y: player2.y * scaleY,
      width: config.paddleWidth * scaleX,
      height: config.paddleHeight * scaleY
    };
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw dividing line for touch areas (only during game play)
    if (gameState.gameState === "playing") {
      // Vertical center line to indicate sides for touch control
      ctx.beginPath();
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.moveTo(canvas.width / 2, 10);
      ctx.lineTo(canvas.width / 2, canvas.height - 10);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line
    }
    
    // Draw net
    const netWidth = 2;
    const netX = canvas.width / 2 - netWidth / 2;
    const netSegmentHeight = 10;
    const netGap = 5;
    
    ctx.fillStyle = colors.net;
    for (let y = 15; y < canvas.height - 15; y += netSegmentHeight + netGap) {
      ctx.fillRect(netX, y, netWidth, netSegmentHeight);
    }
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.strokeStyle = colors.net;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw player 1 paddle
    const paddleRadius = 4;
    ctx.fillStyle = playerNumber === 1 ? colors.activePlayer : colors.paddle;
    
    // Left paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(scaledPaddle1.width + paddleRadius, scaledPaddle1.y);
    ctx.arcTo(0, scaledPaddle1.y, 0, scaledPaddle1.y + paddleRadius, paddleRadius);
    ctx.arcTo(0, scaledPaddle1.y + scaledPaddle1.height, paddleRadius, scaledPaddle1.y + scaledPaddle1.height, paddleRadius);
    ctx.arcTo(scaledPaddle1.width, scaledPaddle1.y + scaledPaddle1.height, scaledPaddle1.width, scaledPaddle1.y + scaledPaddle1.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle1.width, scaledPaddle1.y, scaledPaddle1.width - paddleRadius, scaledPaddle1.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw player 2 paddle
    ctx.fillStyle = playerNumber === 2 ? colors.activePlayer : colors.paddle;
    
    // Right paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(scaledPaddle2.x - paddleRadius, scaledPaddle2.y);
    ctx.arcTo(canvas.width, scaledPaddle2.y, canvas.width, scaledPaddle2.y + paddleRadius, paddleRadius);
    ctx.arcTo(canvas.width, scaledPaddle2.y + scaledPaddle2.height, canvas.width - paddleRadius, scaledPaddle2.y + scaledPaddle2.height, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height, scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y, scaledPaddle2.x + paddleRadius, scaledPaddle2.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(scaledBall.x, scaledBall.y, scaledBall.size, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.fill();
    
    // Add a subtle glow to the ball
    const gradient = ctx.createRadialGradient(
      scaledBall.x, scaledBall.y, 0,
      scaledBall.x, scaledBall.y, scaledBall.size * 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(scaledBall.x, scaledBall.y, scaledBall.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // // Draw scores
    // ctx.fillStyle = colors.score;
    // ctx.font = "bold 48px Arial";
    // ctx.textAlign = "center";
    
    // // Player 1 score
    // ctx.fillStyle = playerNumber === 1 ? colors.scoreHighlight : colors.score;
    // ctx.fillText(player1.score.toString(), canvas.width / 4, 60);
    
    // // Player 2 score
    // ctx.fillStyle = playerNumber === 2 ? colors.scoreHighlight : colors.score;
    // ctx.fillText(player2.score.toString(), (canvas.width / 4) * 3, 60);
    
    // // Draw player names
    // ctx.font = "14px Arial";
    // ctx.fillStyle = colors.score;
    
    // if (player1.name) {
    //   ctx.fillStyle = playerNumber === 1 ? colors.scoreHighlight : colors.score;
    //   ctx.fillText(player1.name, canvas.width / 4, 90);
    // }
    
    // if (player2.name) {
    //   ctx.fillStyle = playerNumber === 2 ? colors.scoreHighlight : colors.score;
    //   ctx.fillText(player2.name, (canvas.width / 4) * 3, 90);
    // }
    
    // If game is not playing, show overlay message
    if (gameState.gameState !== "playing") {
      let message = "";
      let subtext = "";
      
      switch (gameState.gameState) {
        case "waiting":
          message = t('quickMatch.waiting');
          subtext = t('quickMatch.waiting');
          break;
        case "paused":
          message = t('quickMatch.paused');
          subtext = "";
          break;
        case "finished":
          const winner = player1.score > player2.score ? player1.name : player2.name;
          message = `${winner} ${t('quickMatch.wins')}`;
          subtext = `${t('quickMatch.finalScore')}: ${player1.score} - ${player2.score}`;
          break;
        case "cancelled":
          message = t('quickMatch.cancelled');
          break;
      }
      
      // Draw semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw message
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
      
      // Draw subtext
      if (subtext) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 40);
      }
    }
  };
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      // Only redraw if game state has changed
      if (lastRenderedStateRef.current !== gameState) {
        drawGame();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState]);
  
  // Resize canvas effect
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Set canvas size to match parent container
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      
      // Force redraw after resize
      lastRenderedStateRef.current = null;
      drawGame();
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [gameState]);
  
  // Function to handle paddle movement with touch/mouse input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Function to convert canvas coordinates to game coordinates
    const canvasToGameCoords = (canvasX: number, canvasY: number) => {
      if (!gameState || !gameState.config) return { x: 0, y: 0 };
      
      const rect = canvas.getBoundingClientRect();
      
      // Scale factors between canvas and game coordinates
      const scaleX = gameState.config.width / canvas.width;
      const scaleY = gameState.config.height / canvas.height;
      
      // Convert to game coordinates
      const gameX = canvasX * scaleX;
      const gameY = canvasY * scaleY;
      
      return { x: gameX, y: gameY };
    };
    
    // Function to determine direction based on current position and target
    const getDirectionFromTarget = (currentY: number, targetY: number, paddleHeight: number) => {
      // Add padding to allow for the paddle to center on the target
      const paddleCenter = currentY + paddleHeight / 2;
      const threshold = 5; // Small threshold to prevent rapid up/down switching
      
      if (targetY < paddleCenter - threshold) {
        return 'up';
      } else if (targetY > paddleCenter + threshold) {
        return 'down';
      } else {
        return 'stop';
      }
    };
    
    // Touch start/mouse down handler
    const handleStart = (event: TouchEvent | MouseEvent) => {
      event.preventDefault();
      mouseIsDownRef.current = true;
      
      // Only process if the game is in playing state
      if (gameState.gameState !== "playing") return;
      
      // Get position based on event type
      let clientX: number, clientY: number;
      let playerId = 0;
      
      if ('touches' in event) {
        // Touch event - handle multiple touches
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches[i];
          clientX = touch.clientX;
          clientY = touch.clientY;
          
          // Convert to canvas coordinates
          const rect = canvas.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          
          // Determine which player's side was touched
          if (x < canvas.width / 2) {
            // Left side (Player 1)
            playerId = 1;
          } else {
            // Right side (Player 2)
            playerId = 2;
          }
          
          // Convert to game coordinates
          const gameCoords = canvasToGameCoords(x, y);
          
          // Store the target position for this player
          touchTargetsRef.current[playerId] = gameCoords.y;
          
          // Start moving the paddle in the appropriate direction
          const currentY = playerId === 1 ? gameState.player1.y : gameState.player2.y;
          const direction = getDirectionFromTarget(
            currentY, 
            gameCoords.y, 
            gameState.config.paddleHeight
          );
          
          onMove(direction, playerId);
        }
      } else {
        // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;
        
        // Convert to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Determine which player's side was clicked
        if (x < canvas.width / 2) {
          // Left side (Player 1)
          playerId = 1;
        } else {
          // Right side (Player 2)
          playerId = 2;
        }
        
        // Convert to game coordinates
        const gameCoords = canvasToGameCoords(x, y);
        
        // Store the target position for this player
        touchTargetsRef.current[playerId] = gameCoords.y;
        
        // Start moving the paddle in the appropriate direction
        const currentY = playerId === 1 ? gameState.player1.y : gameState.player2.y;
        const direction = getDirectionFromTarget(
          currentY, 
          gameCoords.y, 
          gameState.config.paddleHeight
        );
        
        onMove(direction, playerId);
      }
    };
    
    // Touch move/mouse move handler
    const handleMove = (event: TouchEvent | MouseEvent) => {
      // Only process if mouse is down and game is in playing state
      if (!mouseIsDownRef.current || gameState.gameState !== "playing") return;
      
      event.preventDefault();
      
      // Get position based on event type
      if ('touches' in event) {
        // Touch event - handle multiple touches
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches[i];
          const rect = canvas.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          
          // Determine which player's side was touched
          let playerId;
          if (x < canvas.width / 2) {
            // Left side (Player 1)
            playerId = 1;
          } else {
            // Right side (Player 2)
            playerId = 2;
          }
          
          // Convert to game coordinates
          const gameCoords = canvasToGameCoords(x, y);
          
          // Update the target position for this player
          touchTargetsRef.current[playerId] = gameCoords.y;
          
          // Update paddle movement direction
          const currentY = playerId === 1 ? gameState.player1.y : gameState.player2.y;
          const direction = getDirectionFromTarget(
            currentY, 
            gameCoords.y, 
            gameState.config.paddleHeight
          );
          
          onMove(direction, playerId);
        }
      } else {
        // Mouse event
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Determine which player's side was clicked
        let playerId;
        if (x < canvas.width / 2) {
          // Left side (Player 1)
          playerId = 1;
        } else {
          // Right side (Player 2)
          playerId = 2;
        }
        
        // Convert to game coordinates
        const gameCoords = canvasToGameCoords(x, y);
        
        // Update the target position for this player
        touchTargetsRef.current[playerId] = gameCoords.y;
        
        // Update paddle movement direction
        const currentY = playerId === 1 ? gameState.player1.y : gameState.player2.y;
        const direction = getDirectionFromTarget(
          currentY, 
          gameCoords.y, 
          gameState.config.paddleHeight
        );
        
        onMove(direction, playerId);
      }
    };
    
    // Touch end/mouse up handler
    const handleEnd = () => {
      mouseIsDownRef.current = false;
      
      // Stop movement for both players
      onMove('stop', 1);
      onMove('stop', 2);
      
      // Clear target positions
      touchTargetsRef.current = {};
    };
    
    // Add event listeners
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("touchstart", handleStart, { passive: false });
    
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);
    
    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("touchstart", handleStart);
      
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [gameState, onMove, onSetPosition]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ touchAction: "none" }} // Prevent touch scrolling
    />
  );
};

export default PongGame;