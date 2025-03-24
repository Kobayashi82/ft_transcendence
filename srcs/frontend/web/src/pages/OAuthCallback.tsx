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
        // Obtener parámetros de la URL
        const params = new URLSearchParams(location.search);
        
        // Verificar si hay un token de acceso directamente en la URL (enviado por el servidor)
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (accessToken) {
          console.log("Procesando token de acceso desde URL");
          
          // Guardar el token y obtener información de usuario
          await setUserAndTokens(
            accessToken, 
            expiresIn ? parseInt(expiresIn) : undefined
          );
          
          // Redirigir al dashboard
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Verificar errores en la URL
        const errorCode = params.get('error');
        if (errorCode) {
          const errorMessage = params.get('error_description') || 'Error de autenticación';
          throw new Error(decodeURIComponent(errorMessage));
        }
        
        // Si llegamos aquí y no tenemos un token, algo salió mal
        // Intentamos navegar al dashboard para ver si la cookie está presente
        navigate('/dashboard', { replace: true });
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