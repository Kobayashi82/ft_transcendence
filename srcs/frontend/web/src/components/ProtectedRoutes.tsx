import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './ui/Spinner';
import { isSessionActive } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectPath = '/login' 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Check for tokens
const hasSession = isSessionActive();

// Mostrar loader mientras se verifica la autenticación
if (loading) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-3 text-gray-500">Verifying authentication...</p>
    </div>
  );
}

// Si está autenticado, mostrar hijos
if (isAuthenticated && user) {
  return <>{children}</>;
}

// Si tenemos sesión pero no autenticado,
// mostrar loading mientras intentamos verificar
if (hasSession && !isAuthenticated) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-3 text-gray-500">Restoring session...</p>
    </div>
  );
}
  
  // If not authenticated and done loading, redirect to login
  return <Navigate to={redirectPath} state={{ from: location }} replace />;
};

export default ProtectedRoute;