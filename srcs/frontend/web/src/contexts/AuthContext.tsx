import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, User } from '../services/api';

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
  setUserAndTokens: (token: string, refreshToken: string) => Promise<void>;
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
  const navigate = useNavigate();
  const location = useLocation();

  // Función para configurar tokens y obtener información del usuario
  const setUserAndTokens = async (token: string, refreshToken: string) => {
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Error al obtener datos del usuario:', err);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      setError('Error al obtener datos del usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Procesar tokens de URL
  useEffect(() => {
    const processURLTokens = async () => {
      try {
        // Solo procesar si estamos en la ruta dashboard
        if (!location.pathname.includes('/dashboard')) {
          return;
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (token && refreshToken) {
          console.log("Procesando tokens de URL...");
          await setUserAndTokens(token, refreshToken);
          
          // Limpiar URL para seguridad
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Error procesando tokens de URL:", err);
      }
    };
    
    processURLTokens();
  }, [location, navigate]);

  // Check if user is already logged in (token exists)
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (err) {
        // If token is invalid, try to refresh it
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          const refreshData = await authApi.refreshToken(refreshToken);
          localStorage.setItem('auth_token', refreshData.access_token);
          localStorage.setItem('refresh_token', refreshData.refresh_token);
          setUser(refreshData.user);
        } catch (refreshErr) {
          // If refresh fails, clear tokens
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setError('Session expired. Please login again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
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
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setUser(response.user);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setLoading(false);
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