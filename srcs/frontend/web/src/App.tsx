import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';
import TwoFactorAuth from './pages/TwoFactorAuth';
import ServerStatusPage from './pages/ServerStatusPage';
import UserSettings from './pages/UserSettings';
import NotFound from './pages/NotFound';
import Spinner from './components/ui/Spinner';
import ConnectionChecker from './components/ConnectionChecker';
import ProtectedRoute from './components/ProtectedRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import { isSessionActive } from './services/api';

const App: React.FC = () => {
  // Add some debug logs to help troubleshooting
  useEffect(() => {
	const hasSession = isSessionActive();
	
	console.log('App initialization:', {
	  hasSession,
	  apiUrl: import.meta.env.VITE_API_URL || 'Not set'
	});
  }, []);

  return (
    <ErrorBoundary>
      <ConnectionChecker healthEndpoint="/api/health">
        <Router>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </Router>
      </ConnectionChecker>
    </ErrorBoundary>
  );
};

// Separated AppRoutes component for better organization
const AppRoutes: React.FC = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-3 text-gray-500">Loading application...</p>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/status" element={<ServerStatusPage />} />
      <Route path="/2fa" element={<TwoFactorAuth />} />
      
      {/* OAuth callback routes */}
      <Route path="/oauth/callback/:provider" element={<OAuthCallback />} />
      <Route path="/api/auth/oauth/:provider/callback" element={<OAuthCallback />} />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <UserSettings />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect root to dashboard or login depending on auth state */}
      <Route 
        path="/" 
        element={<RootRedirect />}
      />

      {/* Catch all unknown routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Component to handle root path redirects based on auth state
const RootRedirect: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};

export default App;