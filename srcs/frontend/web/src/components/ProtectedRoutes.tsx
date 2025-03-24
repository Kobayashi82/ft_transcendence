import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './ui/Spinner';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const token = localStorage.getItem('auth_token');
	
	console.log("ProtectedRoute - token:", token ? "✓" : "✗", "user:", user ? "✓" : "✗", "loading:", loading);
	
	if (loading) {
	  return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
	}
	
	// Verificar si hay un token en localStorage, sin importar el estado de user
	if (!token) {
	  console.log("No hay token, redirigiendo a login");
	  return <Navigate to="/login" replace />;
	}
	
	return <>{children}</>;
  };

export default ProtectedRoute;