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
    
    const timer = setTimeout(async () => {
      try {
        // Check if session is still active
        if (!isSessionActive()) return;
        
        const refreshData = await authApi.refreshToken();
        
        // Setup the next refresh
        setupRefreshTimer(refreshData.expires_in);
      } catch (err) {
        console.error('Token refresh failed:', err);
        // Don't logout here - let the request interceptor handle expired tokens
      }
    }, refreshTime);
    
    setRefreshTimer(timer);
  }, [refreshTimer]);

  // Función para configurar token y obtener información del usuario
  const setUserAndTokens = async (token: string, expiresIn = 3600) => {
    try {
      // Store token in memory only (not localStorage)
      setAccessToken(token, expiresIn);
      
      // Setup token refresh timer
      setupRefreshTimer(expiresIn);
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Error al obtener datos del usuario:', err);
      clearAccessToken();
      setError('Error al obtener datos del usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Procesar tokens de URL directamente del Dashboard como respaldo
  useEffect(() => {
    const processURLTokens = async () => {
      try {
        // Solo procesar si estamos en la ruta dashboard
        if (!location.pathname.includes('/dashboard')) {
          return;
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('access_token');
        const expiresIn = params.get('expires_in') ? parseInt(params.get('expires_in')!) : undefined;
        
        if (token) {
          console.log("AuthContext: Procesando token de URL...");
          await setUserAndTokens(token, expiresIn);
          
          // Limpiar URL para seguridad
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Error procesando token de URL:", err);
      }
    };
    
    processURLTokens();
  }, [location, navigate]);

  // Check if user is already logged in (session is active)
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Check if we have a session cookie
      if (!isSessionActive()) {
        setLoading(false);
        return;
      }
      
      try {
        // Try to get current user info
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        
        // Setup refresh timer - we'll need to get a fresh token first
        try {
          const tokenData = await authApi.refreshToken();
          setupRefreshTimer(tokenData.expires_in);
        } catch (refreshErr) {
          console.error('Failed to refresh token during init:', refreshErr);
          // Don't clear session here - user might still be able to use the app
        }
      } catch (err) {
        console.error('Failed to get user data:', err);
        setError('Session expired. Please login again.');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [setupRefreshTimer]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login({ email, password });
      
      // Asegurarte de que los tokens se almacenan
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      console.log("Tokens almacenados:", response.access_token.substring(0, 10) + "...");
      
      // Set user state
      setUser(response.user);
      
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
      
      // Set user state
      setUser(response.user);
      
      // Setup token refresh timer
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
      // Clear refresh timer
      if (refreshTimer) clearTimeout(refreshTimer);
      setRefreshTimer(null);
      
      // Call API to logout (this will clear the cookie server side)
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear token from memory
      clearAccessToken();
      
      // Clear user state
      setUser(null);
      setLoading(false);
      
      // Redirect to login
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