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
  playerNumber: number | null;
  onMove: (direction: 'up' | 'down' | 'stop') => void;
  onSetPosition: (y: number) => void;
}

const PongGame: React.FC<PongGameProps> = ({ gameState, playerNumber, onMove, onSetPosition }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mouseIsDownRef = useRef<boolean>(false);
  
  // Colors
  const colors = {
    background: "#1f2937",  // Dark blue-gray
    border: "rgba(255, 255, 255, 0.2)",
    net: "rgba(255, 255, 255, 0.2)",
    paddle: "#6366f1", // Indigo
    ball: "#ffffff",
    score: "rgba(255, 255, 255, 0.7)",
    scoreHighlight: "#6366f1", // Indigo
  };
  
  // Draw function
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const { config, player1, player2, ball } = gameState;
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
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
    ctx.fillStyle = colors.paddle;
    
    // Left paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(config.paddleWidth + paddleRadius, player1.y);
    ctx.arcTo(0, player1.y, 0, player1.y + paddleRadius, paddleRadius);
    ctx.arcTo(0, player1.y + config.paddleHeight, paddleRadius, player1.y + config.paddleHeight, paddleRadius);
    ctx.arcTo(config.paddleWidth, player1.y + config.paddleHeight, config.paddleWidth, player1.y + config.paddleHeight - paddleRadius, paddleRadius);
    ctx.arcTo(config.paddleWidth, player1.y, config.paddleWidth - paddleRadius, player1.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw player 2 paddle
    ctx.fillStyle = colors.paddle;
    const p2x = canvas.width - config.paddleWidth;
    
    // Right paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(p2x - paddleRadius, player2.y);
    ctx.arcTo(canvas.width, player2.y, canvas.width, player2.y + paddleRadius, paddleRadius);
    ctx.arcTo(canvas.width, player2.y + config.paddleHeight, canvas.width - paddleRadius, player2.y + config.paddleHeight, paddleRadius);
    ctx.arcTo(p2x, player2.y + config.paddleHeight, p2x, player2.y + config.paddleHeight - paddleRadius, paddleRadius);
    ctx.arcTo(p2x, player2.y, p2x + paddleRadius, player2.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, config.ballSize, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.fill();
    
    // Add a subtle glow to the ball
    const gradient = ctx.createRadialGradient(
      ball.x, ball.y, 0,
      ball.x, ball.y, config.ballSize * 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, config.ballSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw scores
    ctx.fillStyle = colors.score;
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    
    // Player 1 score
    ctx.fillStyle = playerNumber === 1 ? colors.scoreHighlight : colors.score;
    ctx.fillText(player1.score.toString(), canvas.width / 4, 60);
    
    // Player 2 score
    ctx.fillStyle = playerNumber === 2 ? colors.scoreHighlight : colors.score;
    ctx.fillText(player2.score.toString(), (canvas.width / 4) * 3, 60);
    
    // Draw player names
    ctx.font = "14px Arial";
    ctx.fillStyle = colors.score;
    
    if (player1.name) {
      ctx.fillStyle = playerNumber === 1 ? colors.scoreHighlight : colors.score;
      ctx.fillText(player1.name, canvas.width / 4, 90);
    }
    
    if (player2.name) {
      ctx.fillStyle = playerNumber === 2 ? colors.scoreHighlight : colors.score;
      ctx.fillText(player2.name, (canvas.width / 4) * 3, 90);
    }
    
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
      drawGame();
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
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  // Handle mouse/touch input for paddle control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playerNumber) return;
    
    const getCanvasCoords = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      
      // Get position based on event type
      let clientX: number, clientY: number;
      
      if ('touches' in event) {
        // Touch event
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;
      }
      
      // Convert to canvas coordinates
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      return { x, y };
    };
    
    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      mouseIsDownRef.current = true;
      
      // Only process if the game is in playing state
      if (gameState.gameState !== "playing") return;
      
      const { y } = getCanvasCoords(event);
      
      // Calculate paddle position (centered on mouse/touch y)
      const paddleY = y - (gameState.config.paddleHeight / 2);
      
      // Send position update
      onSetPosition(paddleY);
    };
    
    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      // Only process if mouse is down and game is in playing state
      if (!mouseIsDownRef.current || gameState.gameState !== "playing") return;
      
      event.preventDefault();
      const { y } = getCanvasCoords(event);
      
      // Calculate paddle position (centered on mouse/touch y)
      const paddleY = y - (gameState.config.paddleHeight / 2);
      
      // Send position update
      onSetPosition(paddleY);
    };
    
    const handleMouseUp = () => {
      mouseIsDownRef.current = false;
    };
    
    // Add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("touchstart", handleMouseDown);
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleMouseMove);
    
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("touchstart", handleMouseDown);
      
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleMouseMove);
      
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [gameState, playerNumber, onSetPosition]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ touchAction: "none" }} // Prevent touch scrolling
    />
  );
};

export default PongGame;