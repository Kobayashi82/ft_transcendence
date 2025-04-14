import React, { useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

type GameState = 'waiting' | 'playing' | 'paused' | 'finished' | 'cancelled' | 'next';

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
  const scaleFactor = useRef(1);
  const orientationRef = useRef<'portrait' | 'landscape'>('landscape');
  const isLowPerformanceDevice = useRef(false);
  const touchTargetsRef = useRef<{[key: number]: number}>({});

  // Colors
  const colors = {
    background: "#1f2937",
    border: "rgba(255, 255, 255, 0.2)",
    net: "rgba(255, 255, 255, 0.2)",
    paddle: "#6366f1",
    ball: "#ffffff",
    activePlayer: "#60a5fa",
  }

  // Initialize
  useEffect(() => {
    isLowPerformanceDevice.current = window.navigator.hardwareConcurrency < 4 || !!navigator.userAgent.match(/mobile|android/i);
    orientationRef.current = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    return () => {}
  }, []);

  // Draw function
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    lastRenderedStateRef.current = { ...gameState }
    const { config, player1, player2, ball } = gameState;
    const edgePadding = config.edgePadding || 20;
    const scaleX = canvas.width / config.width;
    const scaleY = canvas.height / config.height;
    const scaledPadding = Math.max(5, Math.floor(edgePadding * Math.min(scaleX, scaleY)));
    const scaledBall = {
      x: ball.x * scaleX,
      y: ball.y * scaleY,
      size: Math.max(3, Math.floor(config.ballSize * Math.min(scaleX, scaleY) * 0.4))
    }

    const paddleWidth = Math.max(4, Math.floor(config.paddleWidth * scaleX));
    const paddleHeight = Math.max(20, Math.floor(config.paddleHeight * scaleY));

    // Left paddle
    const scaledPaddle1 = {
      x: scaledPadding,
      y: player1.y * scaleY,
      width: paddleWidth,
      height: paddleHeight
    }

    // Right paddle
    const scaledPaddle2 = {
      x: canvas.width - paddleWidth - scaledPadding,
      y: player2.y * scaleY,
      width: paddleWidth,
      height: paddleHeight
    }

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.current));
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(scaledPadding, scaledPadding, canvas.width - (scaledPadding * 2), canvas.height - (scaledPadding * 2));
    
    // Draw net
    const netWidth = Math.max(1, Math.floor(2 * scaleFactor.current));
    const netX = canvas.width / 2 - netWidth / 2;
    ctx.fillStyle = colors.net;
    ctx.fillRect(netX, scaledPadding, netWidth, canvas.height - (scaledPadding * 2));
    
    // Draw center circle
    const minDimension = Math.min(canvas.width, canvas.height);
    const circleRadius = Math.max(5, minDimension * 0.03);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.net;
    ctx.lineWidth = Math.max(1, minDimension * 0.003);
    ctx.stroke();
    const innerCircleRadius = circleRadius * 0.5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, innerCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();

	// Draw left paddle
    const paddleRadius = Math.max(2, Math.floor(4 * scaleFactor.current));
    ctx.fillStyle = playerNumber === 1 ? colors.activePlayer : colors.paddle;
    ctx.beginPath();
    ctx.moveTo(scaledPaddle1.x + scaledPaddle1.width - paddleRadius, scaledPaddle1.y);
    ctx.arcTo(scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y, scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y + paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle1.x + scaledPaddle1.width, scaledPaddle1.y + scaledPaddle1.height, scaledPaddle1.x + scaledPaddle1.width - paddleRadius, scaledPaddle1.y + scaledPaddle1.height, paddleRadius);
    ctx.arcTo(scaledPaddle1.x, scaledPaddle1.y + scaledPaddle1.height, scaledPaddle1.x, scaledPaddle1.y + scaledPaddle1.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle1.x, scaledPaddle1.y, scaledPaddle1.x + paddleRadius, scaledPaddle1.y, paddleRadius);
    ctx.closePath();
    ctx.fill();

    // Draw right paddle
    ctx.fillStyle = playerNumber === 2 ? colors.activePlayer : colors.paddle;
    ctx.beginPath();
    ctx.moveTo(scaledPaddle2.x + paddleRadius, scaledPaddle2.y);
    ctx.arcTo(scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y, scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y + paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle2.x + scaledPaddle2.width, scaledPaddle2.y + scaledPaddle2.height, scaledPaddle2.x + scaledPaddle2.width - paddleRadius, scaledPaddle2.y + scaledPaddle2.height, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height, scaledPaddle2.x, scaledPaddle2.y + scaledPaddle2.height - paddleRadius, paddleRadius);
    ctx.arcTo(scaledPaddle2.x, scaledPaddle2.y, scaledPaddle2.x + paddleRadius, scaledPaddle2.y, paddleRadius);
    ctx.closePath();
    ctx.fill();

    // Draw ball
    ctx.beginPath();
    ctx.arc(scaledBall.x, scaledBall.y, scaledBall.size, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.fill();

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
          const roundWinner = player1.score > player2.score ? player1.name : player2.name;
          if (gameState.settings.tournamentRound === 1) {
            message = `${roundWinner} ${t('tournament.winsSemifinal')}`;
            subtext = `${t('tournament.score')}: ${player1.score} - ${player2.score}`;
          } else {
            message = `${roundWinner} ${t('tournament.winsTournament')}`;
            subtext = `${t('tournament.score')}: ${player1.score} - ${player2.score}`;
          }
          break;
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gameAreaWidth = canvas.width - (scaledPadding * 2);
      const gameAreaHeight = canvas.height - (scaledPadding * 2);
      const maxMainFontSize = Math.min(gameAreaHeight * 0.15, gameAreaWidth * 0.05);
      const isMobile = window.innerWidth <= 767;
      const isPortrait = orientationRef.current === 'portrait';

      let mainFontSizeBase = Math.min(gameAreaWidth / (message.length > 15 ? 15 : 10), maxMainFontSize);
      if (isMobile) mainFontSizeBase *= isPortrait ? 0.9 : 0.8;

      const mainFontSize = Math.max(14, Math.min(36, mainFontSizeBase));
      const subFontSize = Math.max(10, Math.min(24, mainFontSize * 0.65));

      ctx.font = `bold ${mainFontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const mainTextWidth = ctx.measureText(message).width;
      if (mainTextWidth > gameAreaWidth * 0.9) {
        const newFontSize = Math.floor(mainFontSize * (gameAreaWidth * 0.9 / mainTextWidth));
        ctx.font = `bold ${newFontSize}px Arial`;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2 - (subtext ? mainFontSize / 2 : 0));
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      if (subtext) {
        ctx.font = `${subFontSize}px Arial`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        const subTextWidth = ctx.measureText(subtext).width;
        if (subTextWidth > gameAreaWidth * 0.9) {
          const newSubFontSize = Math.floor(subFontSize * (gameAreaWidth * 0.9 / subTextWidth));
          ctx.font = `${newSubFontSize}px Arial`;
        }
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + mainFontSize * 0.8);
      }
    }
  }

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (lastRenderedStateRef.current !== gameState) drawGame();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState]);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const isPortrait = window.innerHeight > window.innerWidth;
      orientationRef.current = isPortrait ? 'portrait' : 'landscape';

	  const parent = canvas.parentElement;
      if (parent) {
        const displayWidth = parent.clientWidth;
        const displayHeight = parent.clientHeight;

        if (isPortrait)	scaleFactor.current = Math.max(0.2, Math.min(1, displayWidth / 400));
        else			scaleFactor.current = Math.max(0.2, Math.min(1, displayHeight / 300));

        const deviceScale = isLowPerformanceDevice.current ? 0.75 : 1.0;
        canvas.width = displayWidth * deviceScale;
        canvas.height = displayHeight * deviceScale;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
      }

      lastRenderedStateRef.current = null;
      drawGame();
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => { setTimeout(handleResize, 300); });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    }
  }, [gameState]);

  // Paddle movement with touch/mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasToGameCoords = (canvasX: number, canvasY: number) => {
      if (!gameState || !gameState.config) return { x: 0, y: 0 }

      const scaleX = gameState.config.width / canvas.width;
      const scaleY = gameState.config.height / canvas.height;
      const edgePadding = gameState.config.edgePadding || 20;
      const scaledPadding = Math.max(5, Math.floor(edgePadding * Math.min(scaleX, scaleY)));
      const adjustedCanvasX = Math.max(0, Math.min(canvasX, canvas.width));
      const adjustedCanvasY = Math.max(scaledPadding, Math.min(canvasY, canvas.height - scaledPadding));
      const gameX = adjustedCanvasX * scaleX;
      const gameY = adjustedCanvasY * scaleY;

      return { x: gameX, y: gameY }
    }

    const isPlayerAI = (playerNum: number) => {
      if (playerNum === 1 && gameState.player1.isAI) return true;
      if (playerNum === 2 && gameState.player2.isAI) return true;
      return false;
    }

    // Touch start/mouse down
    const handleStart = (event: TouchEvent | MouseEvent) => {
      event.preventDefault();
      mouseIsDownRef.current = true;

      if (gameState.gameState !== "playing") return;

	  let clientX: number, clientY: number;
      let playerId = playerNumber; // Default to controlling assigned player

      if ('touches' in event) {
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches[i];
          clientX = touch.clientX;
          clientY = touch.clientY;

		  const rect = canvas.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          if (x < canvas.width / 2)	playerId = 1;
          else						playerId = 2;

          if (isPlayerAI(playerId)) continue;

          const gameCoords = canvasToGameCoords(x, y);
          touchTargetsRef.current[playerId] = gameCoords.y;
          const paddleHeight = gameState.config.paddleHeight;
          const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
          onSetPosition(targetY, playerId);
        }
      } else { // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;

		const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        if (x < canvas.width / 2) 	playerId = 1;
        else 						playerId = 2;

        if (isPlayerAI(playerId)) return;

        const gameCoords = canvasToGameCoords(x, y);
        touchTargetsRef.current[playerId] = gameCoords.y;
        const paddleHeight = gameState.config.paddleHeight;
        const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
        onSetPosition(targetY, playerId);
      }
    }

    // Touch move/mouse move
    const handleMove = (event: TouchEvent | MouseEvent) => {
      if (!mouseIsDownRef.current || gameState.gameState !== "playing") return;

      event.preventDefault();

      if ('touches' in event) {
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches[i];
          const rect = canvas.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

		  let playerId;
          if (x < canvas.width / 2) playerId = 1;
          else 						playerId = 2;

          if (isPlayerAI(playerId)) continue;

		  const gameCoords = canvasToGameCoords(x, y);
          touchTargetsRef.current[playerId] = gameCoords.y;
          const paddleHeight = gameState.config.paddleHeight;
          const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
          onSetPosition(targetY, playerId);
        }
      } else { // Mouse event
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let playerId;
        if (x < canvas.width / 2)	playerId = 1;
        else 						playerId = 2;
        
        if (isPlayerAI(playerId)) return;

		const gameCoords = canvasToGameCoords(x, y);
        touchTargetsRef.current[playerId] = gameCoords.y;
        const paddleHeight = gameState.config.paddleHeight;
        const targetY = Math.max(0, gameCoords.y - (paddleHeight / 2));
        onSetPosition(targetY, playerId);
      }
    }
    
    // Touch end/mouse up
    const handleEnd = () => {
      mouseIsDownRef.current = false;
      Object.keys(touchTargetsRef.current).forEach(key => { onMove('stop', parseInt(key)); });
      touchTargetsRef.current = {}
    }

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
    }
  }, [gameState, onMove, onSetPosition, playerNumber]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}

export default PongGame;
