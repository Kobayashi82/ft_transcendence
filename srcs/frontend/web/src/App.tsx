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
import APIDocumentation from './pages/APIDocumentation';
import { isSessionActive } from './services/api';
import Home from './pages/Home';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

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
  const { loading, isAuthenticated } = useAuth();
  
  // Add more detailed logging
  useEffect(() => {
    console.log('AppRoutes rendered:', { loading, isAuthenticated });
  }, [loading, isAuthenticated]);
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-3 text-gray-500">Loading application...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthenticated && <Header />}
      <main className="flex-grow">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={!isAuthenticated ? <Home /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/status" element={<ServerStatusPage />} />
          <Route path="/2fa" element={<TwoFactorAuth />} />
          <Route path="/api-docs/:service" element={<APIDocumentation />} />
          
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
          
          {/* Catch all unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAuthenticated && <Footer />}
    </div>
  );
};

export default App;