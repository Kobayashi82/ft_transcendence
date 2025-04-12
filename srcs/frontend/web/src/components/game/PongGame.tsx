import React, { useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

// Game state types
type GameState = 'waiting' | 'playing' | 'paused' | 'finished' | 'cancelled' | 'next';

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
  edgePadding?: number;
}

interface GameSettings {
  ballSpeed: string;
  accelerationEnabled: boolean;
  paddleSize: string;
  tournamentMode?: boolean;
  tournamentRound?: number;
  tournamentName?: string;
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
  onMove: (direction: 'up' | 'down' | 'stop', player: number) => void;
  onSetPosition: (y: number, player: number) => void;
}

const PongGame: React.FC<PongGameProps> = ({ gameState, playerNumber, onMove, onSetPosition }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mouseIsDownRef = useRef<boolean>(false);
  const lastRenderedStateRef = useRef<GameStateData | null>(null);
  
  // Add scaleFactor reference
  const scaleFactor = useRef(1);
  
  // For tracking device orientation
  const orientationRef = useRef<'portrait' | 'landscape'>('landscape');
  
  // Performance detection
  const isLowPerformanceDevice = useRef(false);
  
  // For ball hit effect
  const ballHitEffectTimer = useRef<number | null>(null);
  const ballHitColor = useRef("#ffffff");
  
  // References for touch control
  const touchTargetsRef = useRef<{[key: number]: number}>({});
  
  // Colors
  const colors = {
    background: "#1f2937",  // Dark blue-gray
    border: "rgba(255, 255, 255, 0.2)",
    net: "rgba(255, 255, 255, 0.2)",
    paddle: "#6366f1", // Indigo
    ball: "#ffffff",
    ballHit: "#a5f3fc", // Light blue when ball hits paddle
    score: "rgba(255, 255, 255, 0.7)",
    scoreHighlight: "#6366f1", // Indigo
    activePlayer: "#60a5fa", // Lighter blue for active player's paddle
  };
  
  // Initialize and handle device detection
  useEffect(() => {
    // Detect low performance devices
    isLowPerformanceDevice.current = 
      window.navigator.hardwareConcurrency < 4 || 
      !!navigator.userAgent.match(/mobile|android/i);
    
    // Initial orientation detection
    orientationRef.current = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    // Initialize ball color
    ballHitColor.current = colors.ball;
    
    // Clean up any existing timers on unmount
    return () => {
      if (ballHitEffectTimer.current !== null) {
        clearTimeout(ballHitEffectTimer.current);
      }
    };
  }, []);
  
  // Draw function
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Update the last rendered state
    lastRenderedStateRef.current = { ...gameState };
    
    const { config, player1, player2, ball } = gameState;
    
    // Get the edge padding from config or use default
    const edgePadding = config.edgePadding || 20;
    
    // Calculate scaler for canvas/game dimensions
    const scaleX = canvas.width / config.width;
    const scaleY = canvas.height / config.height;
    
    // Calculate a consistent padding value scaled to screen size
    const scaledPadding = Math.max(5, Math.floor(edgePadding * Math.min(scaleX, scaleY)));
    
    // Scale game dimensions to canvas size
    const scaledBall = {
      x: ball.x * scaleX,
      y: ball.y * scaleY,
      // Apply a more appropriate ball size with scaling
      size: Math.max(3, Math.floor(config.ballSize * Math.min(scaleX, scaleY) * 0.4))
    };
    
    // Scale paddle dimensions based on screen size
    const paddleWidth = Math.max(4, Math.floor(config.paddleWidth * scaleX));
    const paddleHeight = Math.max(20, Math.floor(config.paddleHeight * scaleY));
    
    // Left paddle position (player 1)
    const scaledPaddle1 = {
      x: scaledPadding, // Position with consistent padding
      y: player1.y * scaleY,
      width: paddleWidth,
      height: paddleHeight
    };
    
    // Right paddle position (player 2)
    const scaledPaddle2 = {
      x: canvas.width - paddleWidth - scaledPadding, // Position with consistent padding
      y: player2.y * scaleY,
      width: paddleWidth,
      height: paddleHeight
    };
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border with scaled width
    const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.current));
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      scaledPadding, 
      scaledPadding, 
      canvas.width - (scaledPadding * 2), 
      canvas.height - (scaledPadding * 2)
    );
    
    // Draw dividing line for touch areas (only during game play)
    if (gameState.gameState === "playing") {
      // Vertical center line to indicate sides for touch control
      ctx.beginPath();
      ctx.setLineDash([Math.max(3, 5 * scaleFactor.current), Math.max(3, 5 * scaleFactor.current)]); // Scaled dashed line
      ctx.moveTo(canvas.width / 2, scaledPadding);
      ctx.lineTo(canvas.width / 2, canvas.height - scaledPadding);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line
    }
    
    // Draw net with scaled dimensions
    const netWidth = Math.max(1, Math.floor(2 * scaleFactor.current));
    const netX = canvas.width / 2 - netWidth / 2;
    const netSegmentHeight = Math.max(5, Math.floor(10 * scaleFactor.current));
    const netGap = Math.max(3, Math.floor(5 * scaleFactor.current));
    
    ctx.fillStyle = colors.net;
    for (let y = scaledPadding + 5; y < canvas.height - scaledPadding - 5; y += netSegmentHeight + netGap) {
      ctx.fillRect(netX, y, netWidth, netSegmentHeight);
    }
    
    // Draw center circle with scaled radius
    const circleRadius = Math.max(10, Math.floor(20 * scaleFactor.current));
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.net;
    ctx.lineWidth = Math.max(1, Math.floor(1 * scaleFactor.current));
    ctx.stroke();
    
    // Draw player 1 paddle with scaled corners
    const paddleRadius = Math.max(2, Math.floor(4 * scaleFactor.current));
    ctx.fillStyle = playerNumber === 1 ? colors.activePlayer : colors.paddle;
    
    // Left paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(scaledPaddle1.x + scaledPaddle1.width - paddleRadius, scaledPaddle1.y);
    ctx.arcTo(scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y, scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y + paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y + scaledPaddle1.height, scaledPaddle1.x + scaledPaddle1.width - paddleRadius, scaledPaddle1.y + scaledPaddle1.height, paddleRadius);
    ctx.arcTo(scaledPaddle1.x, scaledPaddle1.y + scaledPaddle1.height, scaledPaddle1.x, scaledPaddle1.y + scaledPaddle1.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle1.x, scaledPaddle1.y, scaledPaddle1.x + paddleRadius, scaledPaddle1.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw player 2 paddle with scaled corners
    ctx.fillStyle = playerNumber === 2 ? colors.activePlayer : colors.paddle;
    
    // Right paddle with rounded corners
    ctx.beginPath();
    ctx.moveTo(scaledPaddle2.x + paddleRadius, scaledPaddle2.y);
    ctx.arcTo(scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y, scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y + paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y + scaledPaddle2.height, scaledPaddle2.x + scaledPaddle2.width - paddleRadius, scaledPaddle2.y + scaledPaddle2.height, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height, scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y, scaledPaddle2.x + paddleRadius, scaledPaddle2.y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    
    // Draw ball with scaled glow effect - use current ball color (changes on hit)
    ctx.beginPath();
    ctx.arc(scaledBall.x, scaledBall.y, scaledBall.size, 0, Math.PI * 2);
    ctx.fillStyle = ballHitColor.current;
    ctx.fill();
    
    // Only add glow on higher performance devices
    if (!isLowPerformanceDevice.current) {
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
    }
  
    // If game is not playing, show overlay message
    if (gameState.gameState !== "playing") {
      let message = "";
      let subtext = "";
      
      switch (gameState.gameState) {
        case "waiting":
          message = t('quickMatch.waiting');
          subtext = t('quickMatch.waitingToStart');
          break;
        case "paused":
          message = t('quickMatch.paused');
          subtext = t('quickMatch.pressToResume');
          break;
        case "finished":
          const winner = player1.score > player2.score ? player1.name : player2.name;
          message = `${winner} ${t('quickMatch.wins')}`;
          subtext = `${t('quickMatch.finalScore')}: ${player1.score} - ${player2.score}`;
          break;
        case "cancelled":
          message = t('quickMatch.cancelled');
          break;
        case "next":
          // Mostrar quién ganó esta ronda
          const roundWinner = player1.score > player2.score ? player1.name : player2.name;
          
          // Determinar si es semifinal o final basado en el número de ronda del torneo
          if (gameState.settings.tournamentRound === 1) {
            // Semifinal
            message = `${roundWinner} ${t('tournament.winsSemifinal')}`;
            subtext = `${t('tournament.score')}: ${player1.score} - ${player2.score}`;
          } else {
            // Final
            message = `${roundWinner} ${t('tournament.winsTournament')}`;
            subtext = `${t('tournament.score')}: ${player1.score} - ${player2.score}`;
          }
          break;
      }
      
      // Draw semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Asegurarnos de que los textos no sean más grandes que el campo de juego
      const gameAreaWidth = canvas.width - (scaledPadding * 2);
      const gameAreaHeight = canvas.height - (scaledPadding * 2);

      // Calcular tamaños de fuente que se ajusten al campo de juego
      // El texto principal no debe ocupar más del 70% del ancho del área de juego
      // y el subtexto no debe ocupar más del 80%
      const maxMainFontSize = Math.min(gameAreaHeight * 0.15, gameAreaWidth * 0.05);
      const maxSubFontSize = maxMainFontSize * 0.6;
      
      // Calcular tamaño base teniendo en cuenta el dispositivo
      const isMobile = window.innerWidth <= 767;
      const isPortrait = orientationRef.current === 'portrait';
      
      // Tamaños de fuente base, más pequeños para dispositivos móviles
      let mainFontSizeBase = Math.min(
        gameAreaWidth / (message.length > 15 ? 15 : 10), // Ajustar según longitud del mensaje
        maxMainFontSize
      );
      
      // Ajustar según orientación
      if (isMobile) {
        mainFontSizeBase *= isPortrait ? 0.9 : 0.8; // Reducir más en landscape para móviles
      }
      
      // Asegurar un tamaño mínimo y máximo razonable
      const mainFontSize = Math.max(14, Math.min(36, mainFontSizeBase));
      const subFontSize = Math.max(10, Math.min(24, mainFontSize * 0.65));
      
      // Draw message with scaled font and shadow for mejor legibilidad
      ctx.font = `bold ${mainFontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Añadir sombra para mejorar legibilidad
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Medir el ancho del texto para verificar que cabe
      const mainTextWidth = ctx.measureText(message).width;
      if (mainTextWidth > gameAreaWidth * 0.9) {
        // Si el texto es demasiado largo, reducir el tamaño
        const newFontSize = Math.floor(mainFontSize * (gameAreaWidth * 0.9 / mainTextWidth));
        ctx.font = `bold ${newFontSize}px Arial`;
      }
      
      // Dibujar mensaje principal con color más brillante
      ctx.fillStyle = "#ffffff";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2 - (subtext ? mainFontSize / 2 : 0));
      
      // Reset shadow for subtext
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw subtext with scaled font if present
      if (subtext) {
        ctx.font = `${subFontSize}px Arial`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        
        // Medir el ancho del subtexto para verificar que cabe
        const subTextWidth = ctx.measureText(subtext).width;
        if (subTextWidth > gameAreaWidth * 0.9) {
          // Si el texto es demasiado largo, reducir el tamaño
          const newSubFontSize = Math.floor(subFontSize * (gameAreaWidth * 0.9 / subTextWidth));
          ctx.font = `${newSubFontSize}px Arial`;
        }
        
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + mainFontSize * 0.8);
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
  
  // Ball hit effect - watch for ball position changes
  useEffect(() => {
    const lastState = lastRenderedStateRef.current;
    if (!lastState || !gameState || gameState.gameState !== 'playing') return;
    
    // Check if ball position changed significantly (possible hit)
    const ballVelocityX = gameState.ball.x - lastState.ball.x;
    
    // Detect when the ball changes horizontal direction (paddle hit)
    if (lastState.ball.x !== gameState.ball.x && 
       (Math.sign(ballVelocityX) !== Math.sign(ballVelocityX) || Math.abs(ballVelocityX) > 5)) {
      
      // Flash the ball color
      ballHitColor.current = colors.ballHit;
      
      // Reset color after a short delay
      if (ballHitEffectTimer.current !== null) {
        clearTimeout(ballHitEffectTimer.current);
      }
      
      ballHitEffectTimer.current = window.setTimeout(() => {
        ballHitColor.current = colors.ball;
        ballHitEffectTimer.current = null;
      }, 100) as unknown as number;
    }
  }, [gameState?.ball.x, gameState?.ball.y]);
  
  // Resize canvas effect
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Determine orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      orientationRef.current = isPortrait ? 'portrait' : 'landscape';
      
      // Set canvas size to match parent container
      const parent = canvas.parentElement;
      if (parent) {
        const displayWidth = parent.clientWidth;
        const displayHeight = parent.clientHeight;
        
        // Calculate scale factor based on orientation
        if (isPortrait) {
          // In portrait mode, scale based on width
          scaleFactor.current = Math.max(0.2, Math.min(1, displayWidth / 400));
        } else {
          // In landscape mode, scale based on height
          scaleFactor.current = Math.max(0.2, Math.min(1, displayHeight / 300));
        }
        
        // Scale display based on device capabilities
        const deviceScale = isLowPerformanceDevice.current ? 0.75 : 1.0;
        
        // Set display dimensions to maintain visual size
        canvas.width = displayWidth * deviceScale;
        canvas.height = displayHeight * deviceScale;
        
        // Set CSS dimensions to maintain visual size
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
      }
      
      // Force redraw after resize
      lastRenderedStateRef.current = null;
      drawGame();
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Handle orientation changes with a delay to ensure device has completed rotation
    window.addEventListener("orientationchange", () => {
      // Short delay to ensure dimensions are updated after rotation
      setTimeout(handleResize, 300);
    });
    
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
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
      
      // Get padding from config
      const edgePadding = gameState.config.edgePadding || 20;
      const scaledPadding = Math.max(5, Math.floor(edgePadding * Math.min(scaleX, scaleY)));
      
      // Adjust for padding in the calculation
      const adjustedCanvasX = Math.max(0, Math.min(canvasX, canvas.width));
      const adjustedCanvasY = Math.max(scaledPadding, Math.min(canvasY, canvas.height - scaledPadding));
      
      // Convert to game coordinates
      const gameX = adjustedCanvasX * scaleX;
      const gameY = adjustedCanvasY * scaleY;
      
      return { x: gameX, y: gameY };
    };
    
    // Touch start/mouse down handler
    const handleStart = (event: TouchEvent | MouseEvent) => {
      event.preventDefault();
      mouseIsDownRef.current = true;
      
      // Only process if the game is in playing state
      if (gameState.gameState !== "playing") return;
      
      // Get position based on event type
      let clientX: number, clientY: number;
      let playerId = playerNumber; // Default to controlling assigned player
      
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
          
          // Move directly to the position - use setPosition instead of onMove
          // Set paddle center position directly to the Y coordinate of the click
          const paddleHeight = gameState.config.paddleHeight;
          const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
          onSetPosition(targetY, playerId);
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
        
        // Move directly to the position - use setPosition instead of onMove
        // Set paddle center position directly to the Y coordinate of the click
        const paddleHeight = gameState.config.paddleHeight;
        const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
        onSetPosition(targetY, playerId);
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
          
          // Move directly to the position - use setPosition instead of onMove
          // Set paddle center position directly to the Y coordinate of the movement
          const paddleHeight = gameState.config.paddleHeight;
          const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
          onSetPosition(targetY, playerId);
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
        
        // Move directly to the position - use setPosition instead of onMove
        // Set paddle center position directly to the Y coordinate of the movement
        const paddleHeight = gameState.config.paddleHeight;
        const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
        onSetPosition(targetY, playerId);
      }
    };
    
    // Touch end/mouse up handler
    const handleEnd = () => {
      mouseIsDownRef.current = false;
      
      // Stop movement for active players
      Object.keys(touchTargetsRef.current).forEach(key => {
        onMove('stop', parseInt(key));
      });
      
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
  }, [gameState, onMove, onSetPosition, playerNumber]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ touchAction: "none" }} // Prevent touch scrolling
    />
  );
};

export default PongGame;