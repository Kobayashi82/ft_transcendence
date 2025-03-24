import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, User as UserIcon, Smartphone, Clock, Shield, 
  Settings, Bell, Home, Menu, X
} from 'lucide-react';
import { useToast } from './ToastContext';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = 'Dashboard',
  showBackButton = false
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        type: 'success',
        message: 'You have been successfully logged out.',
      });
      navigate('/login');
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to log out. Please try again.',
      });
    }
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header/Navigation bar */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-blue-600">MyAuth</span>
              </div>
              
              {/* Desktop navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link 
                  to="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive('/dashboard') 
                      ? 'border-b-2 border-blue-500 text-gray-900' 
                      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
                <Link 
                  to="/settings"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive('/settings') 
                      ? 'border-b-2 border-blue-500 text-gray-900' 
                      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
                <Link 
                  to="/status"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive('/status') 
                      ? 'border-b-2 border-blue-500 text-gray-900' 
                      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  System Status
                </Link>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
            
            {/* User menu */}
            <div className="hidden sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <div className="flex rounded-full bg-gray-100 p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  {user && (
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{user.username}</div>
                      <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="ml-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                to="/dashboard"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/dashboard')
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/settings')
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <Link
                to="/status"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/status')
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                System Status
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile navigation */}
      <div className="sm:hidden bg-white border-t shadow-sm fixed bottom-0 left-0 right-0 z-10">
        <div className="grid grid-cols-3 text-center">
          <Link 
            to="/dashboard"
            className={`flex flex-col items-center justify-center py-2 ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link 
            to="/settings"
            className={`flex flex-col items-center justify-center py-2 ${
              isActive('/settings') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-1">Settings</span>
          </Link>
          <Link 
            to="/status"
            className={`flex flex-col items-center justify-center py-2 ${
              isActive('/status') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-xs mt-1">Status</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="py-6 sm:pb-6 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;