import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Settings, Home, Shield, Server } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showNavigation?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  title = 'Dashboard', 
  description,
  showNavigation = true
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
              
              {showNavigation && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </button>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </button>
                  <button 
                    onClick={() => navigate('/status')}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    <Server className="mr-2 h-4 w-4" />
                    System Status
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="flex rounded-full bg-gray-100 p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <UserIcon className="h-6 w-6" />
                  </button>
                  {user && (
                    <div className="ml-3 hidden md:block">
                      <div className="text-base font-medium text-gray-800">{user.username}</div>
                      <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleLogout}
                    className="ml-4"
                    icon={<LogOut className="h-4 w-4" />}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      {showNavigation && (
        <div className="sm:hidden bg-white border-t shadow-sm">
          <div className="grid grid-cols-3 text-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center justify-center py-2 text-gray-500"
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Dashboard</span>
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="flex flex-col items-center justify-center py-2 text-gray-500"
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs mt-1">Settings</span>
            </button>
            <button 
              onClick={() => navigate('/status')}
              className="flex flex-col items-center justify-center py-2 text-gray-500"
            >
              <Server className="h-5 w-5" />
              <span className="text-xs mt-1">Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
          
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

