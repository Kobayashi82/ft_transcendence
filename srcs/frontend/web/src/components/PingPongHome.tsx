import React, { useEffect, useRef, useState } from 'react';

interface PingPongGameProps {
  className?: string;
}

const PingPongGame: React.FC<PingPongGameProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>(0);
  const [initialized, setInitialized] = useState(false);
  
  // Performance optimization refs
  const aiUpdateCounter = useRef(0);
  const recentlyColored = useRef(false);
  const isLowPerformanceDevice = useRef(false);
  
  // Game state
  const state = useRef({
    ball: {
      x: 0,
      y: 0,
      radius: 6, // Base radius, will be scaled
      velocityX: 5,
      velocityY: 3,
      speed: 5,
      color: "#ffffff",
      isResetting: false
    },
    leftPaddle: {
      x: 0,
      y: 0,
      width: 12, // Base width, will be scaled
      height: 90, // Base height, will be scaled
      color: "#6366f1",
      score: 0,
      speed: 2.5,
      direction: 1 // 1 for down, -1 for up
    },
    rightPaddle: {
      x: 0,
      y: 0,
      width: 12, // Base width, will be scaled
      height: 90, // Base height, will be scaled
      color: "#6366f1",
      score: 0,
      speed: 2.5,
      direction: 1
    },
    net: {
      x: 0,
      y: 0,
      width: 2, // Base width, will be scaled
      height: 10, // Base height, will be scaled
      color: "rgba(255, 255, 255, 0.2)"
    },
    court: {
      color: "#1f2937"
    },
    scaleFactor: 1 // New property to track scale factor
  });

  // Initialize the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Performance detection
    isLowPerformanceDevice.current = 
      window.navigator.hardwareConcurrency < 4 || 
      !!navigator.userAgent.match(/mobile|android/i);

    // Set canvas dimensions
    const resizeCanvas = () => {
      // Get the display dimensions
      const displayWidth = canvas.offsetWidth;
      const displayHeight = canvas.offsetHeight;
      
      // Calculate scale factor based on canvas width
      // Reference width is 400px (typical desktop size)
      const referenceWidth = 400;
      const newScaleFactor = Math.max(0.2, Math.min(1, canvas.width / referenceWidth));
      state.current.scaleFactor = newScaleFactor;
      
      // Set render dimensions (potentially scaled down for low-end devices)
      const deviceScale = isLowPerformanceDevice.current ? 0.75 : 1.0;
      canvas.width = displayWidth * deviceScale;
      canvas.height = displayHeight * deviceScale;
      
      // Set display dimensions to maintain visual size
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Scale game elements based on canvas width
      const ballRadius = Math.max(2, Math.floor(5 * newScaleFactor));
      state.current.ball.radius = ballRadius;

      const paddleWidth = Math.max(2, Math.floor(8 * newScaleFactor));
      const paddleHeight = Math.max(15, Math.floor(90 * newScaleFactor));
      
      state.current.leftPaddle.width = paddleWidth;
      state.current.leftPaddle.height = paddleHeight;
      state.current.rightPaddle.width = paddleWidth;
      state.current.rightPaddle.height = paddleHeight;
      
      // Adjust net dimensions
      state.current.net.width = Math.max(1, Math.floor(2 * newScaleFactor));
      
      // Calculate paddle offset based on canvas width
      const paddleOffset = Math.max(15, Math.floor(30 * newScaleFactor));
      
      // Ball position
      state.current.ball.x = canvas.width / 2;
      state.current.ball.y = canvas.height / 2;
      
      // Paddles position
      state.current.leftPaddle.x = paddleOffset;
      state.current.leftPaddle.y = canvas.height / 2 - state.current.leftPaddle.height / 2;
      
      state.current.rightPaddle.x = canvas.width - paddleOffset - state.current.rightPaddle.width;
      state.current.rightPaddle.y = canvas.height / 2 - state.current.rightPaddle.height / 2;
      
      // Net position
      state.current.net.x = canvas.width / 2 - state.current.net.width / 2;
           
      setInitialized(true);
    };

    // Call resize initially and add resize listener
    resizeCanvas();
    
    const handleResize = () => {
      resizeCanvas();
    };
    
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestIdRef.current);
    };
  }, []);

  // Drawing functions
  const drawRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  
  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
  };
  
  // Function to draw rounded rectangle for paddles
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
  };
  
  // Function to draw the court border with proper edge padding
  const drawCourtBorder = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    borderWidth: number = 3
  ) => {
    // Scale border width based on canvas size
    const scaledBorderWidth = Math.max(1, Math.floor(borderWidth * state.current.scaleFactor));
    
    // Increased edge padding for more space from walls
    const EDGE_PADDING = Math.max(10, Math.floor(20 * state.current.scaleFactor));
    
    // Draw an elegant border around the court
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = scaledBorderWidth;
    ctx.lineJoin = "round";
    
    // Create subtle gradient for the border
    const borderGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    borderGradient.addColorStop(0, "rgba(99, 102, 241, 0.4)");
    borderGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
    borderGradient.addColorStop(1, "rgba(99, 102, 241, 0.4)");
    
    ctx.strokeStyle = borderGradient;
    
    // Draw the border with proper padding
    ctx.strokeRect(
      scaledBorderWidth + EDGE_PADDING/2, 
      scaledBorderWidth + EDGE_PADDING/2, 
      canvas.width - (scaledBorderWidth*2 + EDGE_PADDING), 
      canvas.height - (scaledBorderWidth*2 + EDGE_PADDING)
    );
  };
  
  // Draw the net
  const drawNet = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const EDGE_PADDING = Math.max(10, Math.floor(20 * state.current.scaleFactor));
    const centerX = canvas.width / 2;
    const playableHeight = canvas.height - (EDGE_PADDING * 2);
    const startY = 15;
    const endY = canvas.height - 15;
    const midY = startY + (playableHeight / 2); 
    
    // Scale circle radius based on canvas width
    const circleRadius = Math.max(5, Math.floor(10 * state.current.scaleFactor));
    
	// Scale line width
	const lineWidth = Math.max(1, Math.floor(2 * state.current.scaleFactor));

	ctx.beginPath();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
	ctx.lineWidth = lineWidth;

	// Draw a single continuous line
	ctx.moveTo(centerX, startY);
	ctx.lineTo(centerX, startY);
	ctx.lineTo(centerX, endY);
	ctx.stroke();
    
    // Add smaller hollow circle at the center
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = lineWidth;
    ctx.arc(centerX, midY - 1, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Tinier dot in the center
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.arc(centerX, midY - 1, Math.max(1, 1.5 * state.current.scaleFactor), 0, Math.PI * 2);
    ctx.fill();
  };

  // Optimized collision detection
  const collision = (ball: any, paddle: any) => {
    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;

    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;

    // Simple AABB collision check - very efficient
    return (
      ballRight > paddleLeft &&
      ballLeft < paddleRight &&
      ballBottom > paddleTop &&
      ballTop < paddleBottom
    );
  };

  // Optimized AI movement logic
  const updateAI = (canvas: HTMLCanvasElement) => {
    const { leftPaddle, rightPaddle, ball, scaleFactor } = state.current;
    
    // Skip AI updates if ball is resetting
    if (ball.isResetting) return;
    
    // Update AI less frequently
    aiUpdateCounter.current = (aiUpdateCounter.current + 1) % 1; // Update every 1 frames
    if (aiUpdateCounter.current !== 0) return;
    
    // Increased edge padding
    const EDGE_PADDING = Math.max(10, Math.floor(20 * scaleFactor));
    
    // Base target positions - track the ball
    let leftTarget = ball.y - leftPaddle.height / 2;
    let rightTarget = ball.y - rightPaddle.height / 2;
    
    // Extended deadzone for stability when ball is moving straight
    const DEADZONE = Math.max(2, Math.floor(4 * scaleFactor));
    
    // Check if ball is moving mostly horizontally (to avoid jittery paddle movements)
    const isMovingMostlyHorizontal = Math.abs(ball.velocityX) > Math.abs(ball.velocityY) * 3;
    
    // Increase deadzone when ball is moving horizontally to prevent small jitters
    const effectiveDeadzone = isMovingMostlyHorizontal ? DEADZONE * 2 : DEADZONE;
    
    // Only calculate if ball is moving toward the paddle
    if (ball.velocityX < 0 && ball.x < canvas.width * 0.7) { // Moving toward left paddle
      // Simplified time to reach calculation
      const timeToReach = (ball.x - leftPaddle.x - leftPaddle.width) / -ball.velocityX;
      if (timeToReach > 0 && timeToReach < 60) { // Only predict if it's sensible
        const predictedY = ball.y + ball.velocityY * timeToReach;
        
        // Simplified strategic adjustments
        if (Math.random() < 0.2 && timeToReach < 30) { // Reduced random factor
          leftTarget = predictedY - leftPaddle.height / 2;
          if (rightPaddle.y > canvas.height / 2) {
            leftTarget -= leftPaddle.height * 0.3;
          } else {
            leftTarget += leftPaddle.height * 0.3;
          }
        } else {
          // Smoother tracking
          if (isMovingMostlyHorizontal) {
            leftTarget = 0.7 * (predictedY - leftPaddle.height / 2) + 0.3 * leftPaddle.y;
          } else {
            leftTarget = predictedY - leftPaddle.height / 2;
          }
        }
      }
    }
    
    if (ball.velocityX > 0 && ball.x > canvas.width * 0.3) { // Moving toward right paddle
      // Simplified time to reach calculation
      const timeToReach = (rightPaddle.x - ball.x - ball.radius) / ball.velocityX;
      if (timeToReach > 0 && timeToReach < 60) { // Only predict if it's sensible
        const predictedY = ball.y + ball.velocityY * timeToReach;
        
        // Simplified strategic adjustments
        if (Math.random() < 0.2 && timeToReach < 30) { // Reduced random factor
          rightTarget = predictedY - rightPaddle.height / 2;
          if (leftPaddle.y > canvas.height / 2) {
            rightTarget -= rightPaddle.height * 0.3;
          } else {
            rightTarget += rightPaddle.height * 0.3;
          }
        } else {
          // Smoother tracking
          if (isMovingMostlyHorizontal) {
            rightTarget = 0.7 * (predictedY - rightPaddle.height / 2) + 0.3 * rightPaddle.y;
          } else {
            rightTarget = predictedY - rightPaddle.height / 2;
          }
        }
      }
    }
    
    // Calculate paddle movement differences
    const leftDiff = leftTarget - leftPaddle.y;
    const rightDiff = rightTarget - rightPaddle.y;
    
    // Apply deadzone to prevent small jittery movements
	// Don't move if the target is too close
    if (Math.abs(leftDiff) < effectiveDeadzone) {
      leftTarget = leftPaddle.y;
    }
    
	// Don't move if the target is too close
    if (Math.abs(rightDiff) < effectiveDeadzone) {
      rightTarget = rightPaddle.y;
    }
    
    // Apply edge padding
    leftTarget = Math.max(EDGE_PADDING, Math.min(leftTarget, canvas.height - leftPaddle.height - EDGE_PADDING));
    rightTarget = Math.max(EDGE_PADDING, Math.min(rightTarget, canvas.height - rightPaddle.height - EDGE_PADDING));
    
    // Simplified movement calculation with fixed lerp factors for better performance
    let leftDelta = (leftTarget - leftPaddle.y) * 0.06;
    let rightDelta = (rightTarget - rightPaddle.y) * 0.06;
    
    // Apply maximum speed limit
    const MAX_SPEED = Math.max(5, Math.floor(10 * scaleFactor)); 
    leftDelta = Math.max(Math.min(leftDelta, MAX_SPEED), -MAX_SPEED);
    rightDelta = Math.max(Math.min(rightDelta, MAX_SPEED), -MAX_SPEED);
    
    // Apply movement
    leftPaddle.y += leftDelta;
    rightPaddle.y += rightDelta;
    
    // Boundary checking for paddles, with padding
    if (leftPaddle.y < EDGE_PADDING) {
      leftPaddle.y = EDGE_PADDING;
    }
    if (leftPaddle.y > canvas.height - leftPaddle.height - EDGE_PADDING) {
      leftPaddle.y = canvas.height - leftPaddle.height - EDGE_PADDING;
    }
    
    if (rightPaddle.y < EDGE_PADDING) {
      rightPaddle.y = EDGE_PADDING;
    }
    if (rightPaddle.y > canvas.height - rightPaddle.height - EDGE_PADDING) {
      rightPaddle.y = canvas.height - rightPaddle.height - EDGE_PADDING;
    }
  };
  
  // Optimized update function
  const update = (canvas: HTMLCanvasElement) => {
    const { ball, leftPaddle, rightPaddle, scaleFactor } = state.current;
    
    // Skip ball movement if in reset state
    if (!ball.isResetting) {
      // Update AI paddles
      updateAI(canvas);
      
      // Move the ball
      ball.x += ball.velocityX;
      ball.y += ball.velocityY;
      
      // Improved boundary collision (top and bottom) with padding to prevent getting stuck
      const WALL_PADDING = Math.max(6, Math.floor((12 + ball.radius * 1.2) * scaleFactor)); // Add extra padding to prevent sticking
      
      if (ball.y - ball.radius < WALL_PADDING) {
        // Top collision - bounce with a minimum velocity to prevent stalling
        ball.y = WALL_PADDING + ball.radius; // Reset position to avoid sticking
        ball.velocityY = Math.abs(ball.velocityY); // Force downward direction
        
        // Ensure minimum vertical velocity after bounce
        if (Math.abs(ball.velocityY) < 2) {
          ball.velocityY = 2 * Math.sign(ball.velocityY);
        }
      } else if (ball.y + ball.radius > canvas.height - WALL_PADDING) {
        // Bottom collision - bounce with a minimum velocity
        ball.y = canvas.height - WALL_PADDING - ball.radius; // Reset position to avoid sticking
        ball.velocityY = -Math.abs(ball.velocityY); // Force upward direction
        
        // Ensure minimum vertical velocity after bounce
        if (Math.abs(ball.velocityY) < 2) {
          ball.velocityY = 2 * Math.sign(ball.velocityY);
        }
      }
      
      // Determine which paddle is being hit
      let player = ball.x < canvas.width / 2 ? leftPaddle : rightPaddle;
      
      // If the ball hits a paddle
      if (collision(ball, player)) {
        // Limit visual effects frequency for better performance
        if (!recentlyColored.current) {
          ball.color = "#a5f3fc"; // Temporary color change on hit
          recentlyColored.current = true;
          
          setTimeout(() => {
            if (canvasRef.current) {
              ball.color = "#ffffff"; // Revert after short delay
              recentlyColored.current = false;
            }
          }, 100);
        }
        
        // Detect if it's a horizontal collision (top or bottom of the paddle)
        // or a vertical collision (front side of the paddle)
        const ballCenterY = ball.y;
        
        // Determine paddle boundaries
        const paddleTop = player.y;
        const paddleBottom = player.y + player.height;
        const paddleLeft = player.x;
        const paddleRight = player.x + player.width;
        
        // Calculate distances to the paddle center
        const paddleCenterY = player.y + player.height / 2;
        
        // Determine if it's a horizontal or vertical collision
		// Improved horizontal edge collision detection
		const isHorizontalCollision = (ball: any, player: any) => {
			const ballCenterY = ball.y;
			const paddleTop = player.y;
			const paddleBottom = player.y + player.height;
			
			// Check if ball is very close to top or bottom edge
			const isNearTopEdge = 
			Math.abs(ballCenterY - paddleTop) <= ball.radius;
			
			const isNearBottomEdge = 
			Math.abs(ballCenterY - paddleBottom) <= ball.radius;
			
			// Check if ball is within paddle's horizontal range
			const ballCenterX = ball.x;
			const paddleLeft = player.x;
			const paddleRight = player.x + player.width;
			const isWithinHorizontalRange = 
			ballCenterX >= paddleLeft && 
			ballCenterX <= paddleRight;
			
			// Determine ball's vertical movement direction
			const isMovingDownward = ball.velocityY > 0;
			const isMovingUpward = ball.velocityY < 0;
			
			// Combine conditions
			return (
			isWithinHorizontalRange && 
			(
				(isNearTopEdge && isMovingDownward) || 
				(isNearBottomEdge && isMovingUpward)
			)
			);
		};
        if (isHorizontalCollision(ball, player)) {
          // Collision with the top or bottom of the paddle
          // Invert only the Y velocity, keep the X direction unchanged
          ball.velocityY = -ball.velocityY;
          
          // Ensure Y velocity has a minimum value to prevent horizontal stalling
          if (Math.abs(ball.velocityY) < 2) {
            ball.velocityY = 2 * Math.sign(ball.velocityY);
          }
          
          // Slight position adjustment to prevent the ball from getting stuck
          if (ballCenterY < paddleCenterY) {
            ball.y = paddleTop - ball.radius - 1; // Above
          } else {
            ball.y = paddleBottom + ball.radius + 1; // Below
          }
        } else {
          // Normal frontal collision (side of the paddle)
          // Calculate where the ball hit the paddle
          let collidePoint = ballCenterY - paddleCenterY;
          collidePoint = collidePoint / (player.height / 2); // Normalize between -1 and 1
          
          // Calculate angle (radians)
          let angleRad = (Math.PI / 4) * collidePoint;
          
          // For strategic plays, occasionally aim for the corners
          const isPlayerLeft = player === leftPaddle;
          
          // Reduced randomness for better performance
          if (Math.random() < 0.3) { // 30% of the time, attempt strategic shots
            // Skew the angle more towards the edges
            if (collidePoint > 0) {
              angleRad = Math.PI / 3.5; // More extreme upward angle
            } else {
              angleRad = -Math.PI / 3.5; // More extreme downward angle
            }
          }
          
          // Ball direction based on which paddle hit it
          const direction = isPlayerLeft ? 1 : -1;
          
          // Change speed based on where it hit
          ball.velocityX = direction * ball.speed * Math.cos(angleRad);
          ball.velocityY = ball.speed * Math.sin(angleRad);
          
          // Ensure minimum horizontal speed to prevent vertical stalling
          if (Math.abs(ball.velocityX) < 2) {
            ball.velocityX = 2 * Math.sign(ball.velocityX);
          }
          
          // Slightly displace the ball to prevent getting stuck in the paddle
          if (isPlayerLeft) {
            ball.x = paddleRight + ball.radius + 1;
          } else {
            ball.x = paddleLeft - ball.radius - 1;
          }
        }
        
        // Adjust maximum speed based on scale factor
        const maxSpeed = Math.max(10, Math.floor(20 * scaleFactor));
        
        // Slightly increase speed to make the game more challenging - but with a maximum limit
        if (ball.speed < maxSpeed) {
          ball.speed += 0.2;
        }
      }
      
      // Reset ball if it goes beyond left or right boundary
      if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        // Update scores
        if (ball.x - ball.radius < 0) {
          rightPaddle.score++;
        } else {
          leftPaddle.score++;
        }
        
        // Set the flag to prevent movement during reset
        ball.isResetting = true;
        
        // Stop all movement immediately to prevent any further updates
        const originalVelocityX = ball.velocityX;
        ball.velocityX = 0;
        ball.velocityY = 0;
        
        // Keep ball out of bounds during the delay (visual trick)
        ball.x = ball.x < 0 ? -20 : canvas.width + 20;
        
        // Reset ball after a slight delay for better visuals
        setTimeout(() => {
          if (canvasRef.current) {
            // Position ball in center and keep velocities at zero
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.speed = 5;
            
            // Wait a bit longer before starting movement again
            setTimeout(() => {
              if (canvasRef.current) {
                // Determine proper direction based on who scored
                const direction = originalVelocityX > 0 ? -1 : 1;
                
                // Set new velocities
                ball.velocityX = direction * 5;
                ball.velocityY = (Math.random() - 0.5) * 4;
                
                // Ensure minimum vertical velocity
                if (Math.abs(ball.velocityY) < 2) {
                  ball.velocityY = 2 * Math.sign(ball.velocityY) || 2; // Default to 2 if sign is 0
                }
                
                // End reset state - allow movement again
                ball.isResetting = false;
              }
            }, 50); // Additional pause before moving again
          }
        }, 300);
      }
    }
  };

  // Render function
  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { scaleFactor } = state.current;
    
    // Clear canvas
    drawRect(ctx, 0, 0, canvas.width, canvas.height, state.current.court.color);
    
    // Draw static elements
    drawCourtBorder(ctx, canvas);
    drawNet(ctx, canvas);
    
    // Draw paddles with rounded corners - scale corner radius based on canvas size
    const cornerRadius = Math.max(2, Math.floor(5 * scaleFactor)); // Rounded corner radius for paddles
    
    // Left paddle with rounded corners
    drawRoundedRect(
      ctx, 
      state.current.leftPaddle.x, 
      state.current.leftPaddle.y, 
      state.current.leftPaddle.width, 
      state.current.leftPaddle.height, 
      cornerRadius,
      state.current.leftPaddle.color
    );
    
    // Right paddle with rounded corners
    drawRoundedRect(
      ctx, 
      state.current.rightPaddle.x, 
      state.current.rightPaddle.y, 
      state.current.rightPaddle.width, 
      state.current.rightPaddle.height, 
      cornerRadius,
      state.current.rightPaddle.color
    );
    
    // Draw the ball
    drawCircle(
      ctx, 
      state.current.ball.x, 
      state.current.ball.y, 
      state.current.ball.radius, 
      state.current.ball.color
    );
    
    // Only draw ball glow on high-performance devices
    if (!isLowPerformanceDevice.current) {
		// Add a subtle shadow/glow to the ball - scale glow size based on canvas width
		ctx.beginPath();
		const glowSize = state.current.ball.radius * (1 + scaleFactor);
		const gradient = ctx.createRadialGradient(
		  state.current.ball.x, 
		  state.current.ball.y, 
		  0,
		  state.current.ball.x, 
		  state.current.ball.y, 
		  glowSize
		);
		gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
		gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = gradient;
		ctx.arc(state.current.ball.x, state.current.ball.y, glowSize, 0, Math.PI * 2);
		ctx.fill();
	  }
	};
  
	// Animation loop
	useEffect(() => {
	  if (!initialized) return;
	  
	  const animate = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		// Update game state
		update(canvas);
		
		// Render game
		render(ctx, canvas);
		
		// Schedule next frame
		requestIdRef.current = requestAnimationFrame(animate);
	  };
	  
	  requestIdRef.current = requestAnimationFrame(animate);
	  
	  return () => {
		cancelAnimationFrame(requestIdRef.current);
	  };
	}, [initialized]);
  
	return (
	  <div className={`relative w-full h-full ${className}`}>
		<canvas 
		  ref={canvasRef} 
		  className="w-full h-full rounded-xl shadow-inner bg-gray-800"
		/>
	  </div>
	);
  };

export default PingPongGame;