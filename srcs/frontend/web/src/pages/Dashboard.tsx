import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const Dashboard: React.FC = () => {
  const { user, logout, loading, setUserAndTokens } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Procesar tokens de URL directamente en Dashboard como respaldo
  useEffect(() => {
    const processURLTokens = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (token && refreshToken) {
          console.log("Dashboard: Procesando tokens de URL...");
          await setUserAndTokens(token, refreshToken);
          
          // Limpiar URL para seguridad
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Error procesando tokens de URL:", err);
      }
    };
    
    processURLTokens();
  }, [location, navigate, setUserAndTokens]);
  
  const handleLogout = async () => {
    await logout();
  };
  
  // Mostrar spinner mientras se carga el usuario
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-blue-600">MyApp</span>
              </div>
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
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.username}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
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
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="rounded-lg border-4 border-dashed border-gray-200 p-4 min-h-96">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Welcome, {user.username}!</h2>
                  <p className="mt-2 text-gray-600">You've successfully logged in to your account.</p>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Username</p>
                        <p className="mt-1 text-sm text-gray-900">{user.username}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Account Type</p>
                        <p className="mt-1 text-sm text-gray-900">{user.account_type || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Two-Factor Authentication</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.has_2fa ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              Disabled
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Roles</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {user.roles?.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;