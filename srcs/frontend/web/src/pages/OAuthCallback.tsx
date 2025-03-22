import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/ui/Spinner';

const OAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setUserAndTokens } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { provider } = useParams<{ provider: string }>();
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obtenemos el código y estado de la URL
        const query = new URLSearchParams(location.search);
        const code = query.get('code');
        const state = query.get('state');
        
        if (!code || !state) {
          setError('Parámetros de autenticación inválidos');
          setLoading(false);
          return;
        }
        
        // Hacemos una petición a nuestro backend para finalizar el proceso
        // Esto es seguro porque el código de autorización solo se puede usar una vez
        const response = await fetch(`/api/auth/oauth/${provider}/callback${location.search}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error en la autenticación');
        }
        
        const data = await response.json();
        
        // Verificamos si se requiere 2FA
        if (data.requires_2fa) {
          // Redirigir a la página de verificación 2FA
          navigate('/2fa', { 
            state: { 
              tempToken: data.temp_token,
              provider 
            } 
          });
          return;
        }
        
        // Guardamos los tokens en localStorage
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        // Actualizamos el contexto de autenticación
        await setUserAndTokens(data.access_token, data.refresh_token);
        
        // Redirigimos al dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Error en callback OAuth:', err);
        setError((err as Error).message || 'Error en la autenticación');
        setLoading(false);
      }
    };
    
    processCallback();
  }, [location, navigate, provider, setUserAndTokens]);
  
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-lg font-medium text-gray-700">
            Completando autenticación con {provider}...
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 flex items-center text-red-600">
            <AlertCircle className="mr-2 h-6 w-6" />
            <h2 className="text-2xl font-bold">Error de autenticación</h2>
          </div>
          <p className="mb-6 text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }
  
  return null;
};

export default OAuthCallback;