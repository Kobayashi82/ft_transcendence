import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, User, getDeviceInfo, isSessionActive, setAccessToken, clearAccessToken } from '../services/api';

// Context interfaces
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUserAndTokens: (token: string, expiresIn?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Clear refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [refreshTimer]);

  // Setup token refresh timer
  const setupRefreshTimer = useCallback((expiresIn: number) => {
    // Clear any existing timer
    if (refreshTimer) clearTimeout(refreshTimer);
    
    // Convert to milliseconds and refresh at 85% of the time
    const refreshTime = (expiresIn * 1000) * 0.85;
    
    console.log(`Setting up refresh timer for ${Math.round(refreshTime/1000)} seconds`);
    
    const timer = setTimeout(async () => {
      try {
        console.log('Executing token refresh');
        // Check if session is still active
        if (!isSessionActive()) {
          console.log('Session inactive, skipping refresh');
          return;
        }
        
        const refreshData = await authApi.refreshToken();
        console.log('Token refreshed successfully', refreshData.expires_in);
        
        // Setup the next refresh
        setupRefreshTimer(refreshData.expires_in);
      } catch (err) {
        console.error('Token refresh failed:', err);
        // Don't logout here - let the request interceptor handle expired tokens
      }
    }, refreshTime);
    
    setRefreshTimer(timer);
  }, [refreshTimer]);

  // Function to set user and tokens
  const setUserAndTokens = async (token: string, expiresIn = 3600) => {
    try {
      // Store token in memory
      setAccessToken(token, expiresIn);
      
      // Setup token refresh timer
      setupRefreshTimer(expiresIn);
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Error getting user data:', err);
      clearAccessToken();
      setError('Error getting user data');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process URL tokens
  useEffect(() => {
    const processURLTokens = async () => {
      try {
        // Only process if we're on the dashboard
        if (!location.pathname.includes('/dashboard')) {
          return;
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('access_token');
        const expiresIn = params.get('expires_in') ? parseInt(params.get('expires_in')!) : undefined;
        
        if (token) {
          console.log("AuthContext: Processing URL token...");
          await setUserAndTokens(token, expiresIn);
          
          // Clean URL for security
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Error processing URL token:", err);
      }
    };
    
    processURLTokens();
  }, [location, navigate]);

  // Check if user is already logged in (session is active)
  useEffect(() => {
	const checkAuthStatus = async () => {
	  console.log('Checking auth status');
	  
	  // Check if we have a session cookie
	  const hasActiveCookie = document.cookie.includes('session_active=true');
	  
	  console.log('Auth status check:', { 
	    hasActiveCookie 
	  });
	  
	  if (!hasActiveCookie) {
	    console.log('No active session found');
	    setLoading(false);
	    return;
	  }
	  
	  try {
	    // Try to refresh the token first since we rely entirely on cookies
	    try {
	  	console.log('Refreshing token during init...');
	  	const tokenData = await authApi.refreshToken();
	  	console.log('Token refreshed successfully during init');
	  	
	  	// Now get user data using the refreshed token state
	  	const userData = await authApi.getCurrentUser();
	  	console.log('User data retrieved successfully:', userData?.id);
	  	setUser(userData);
	    } catch (refreshErr) {
	  	console.error('Failed to refresh token during init:', refreshErr);
	  	
	  	// Try to get user data anyway - it might work if the original token is still valid
	  	try {
	  	  const userData = await authApi.getCurrentUser();
	  	  console.log('User data retrieved successfully:', userData?.id);
	  	  setUser(userData);
	  	} catch (userErr) {
	  	  console.error('Failed to get user data:', userErr);
	  	  setError('Session expired. Please login again.');
	  	}
	    }
	  } catch (err) {
	    console.error('Failed to complete auth checking:', err);
	    setError('Session expired. Please login again.');
	  } finally {
	    setLoading(false);
	  }
	};
    
    checkAuthStatus();
  }, [setupRefreshTimer]);

  // Login function
  const login = async (email: string, password: string) => {
	setLoading(true);
	setError(null);
	
	try {
	  const response = await authApi.login({ email, password });
	  
	  // Almacenar token en memoria solo
	  if (response.access_token) {
		setAccessToken(response.access_token, response.expires_in);
	  }
	  
	  // Establecer usuario
	  setUser(response.user);
	  
	  // Configurar temporizador de refresco
	  if (response.expires_in) {
		setupRefreshTimer(response.expires_in);
	  }
	  
	  navigate('/dashboard');
	} catch (err) {
	  setError((err as Error).message || 'Login failed. Please try again.');
	} finally {
	  setLoading(false);
	}
  };

  // Register function
  const register = async (email: string, username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.register({ email, username, password });
    
      // Establecer usuario
      setUser(response.user);
    
      // Almacenar token solo en memoria
      setAccessToken(response.access_token, response.expires_in);
    
      // Configurar temporizador de refresco
      setupRefreshTimer(response.expires_in);
    
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
  
    try {
      // Limpiar temporizador
      if (refreshTimer) clearTimeout(refreshTimer);
      setRefreshTimer(null);
  
      // Llamar API para cerrar sesión (esto borrará las cookies del lado del servidor)
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Limpiar token de memoria
      clearAccessToken();
  
      // Limpiar estado de usuario
      setUser(null);
      setLoading(false);
  
      // Redirigir a login
      navigate('/login');
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    clearError,
    setUserAndTokens
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};