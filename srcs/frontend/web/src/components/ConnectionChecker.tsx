import React, { useState, useEffect } from 'react';

interface ConnectionCheckerProps {
  children: React.ReactNode;
  healthEndpoint?: string;
  retryInterval?: number;
  initialDelay?: number;
}

const ConnectionChecker: React.FC<ConnectionCheckerProps> = ({ 
  children, 
  healthEndpoint = '/api', // URL relativa al host actual
  retryInterval = 5000,
  initialDelay = 500
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showLoading, setShowLoading] = useState(false);

  const checkConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Usamos la URL relativa para que funcione en cualquier entorno (local o remoto)
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
        setTimeout(() => setRetryCount(prev => prev + 1), retryInterval);
      }
    } catch (error) {
      setIsConnected(false);
      setTimeout(() => setRetryCount(prev => prev + 1), retryInterval);
    }
  };

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);
  
  useEffect(() => {
    if (isConnected === true) {
      setShowLoading(false);
      return;
    }
    
    const timer = setTimeout(() => {
      if (isConnected === null || isConnected === false) {
        setShowLoading(true);
      }
    }, initialDelay);
    
    return () => clearTimeout(timer);
  }, [isConnected, initialDelay]);

  if (isConnected === true || !showLoading) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100">
      <div className="text-center px-6">
        <div className="mb-8">
          <div className="inline-block">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          {isConnected === null ? "Connecting..." : "Oops! Server Unavailable"}
        </h1>
        
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          {isConnected === null 
            ? "Establishing connection to the server..." 
            : "We're having trouble connecting to the server. We'll automatically retry the connection."}
        </p>
      </div>
    </div>
  );
};

export default ConnectionChecker;