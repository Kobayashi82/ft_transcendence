import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Lock } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/ui/Spinner';

const TwoFactorAuth: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { setUserAndTokens } = useAuth();

  // Parse token from URL or location state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    const urlProvider = params.get('provider');
    
    if (urlToken) {
      setToken(urlToken);
    } else if (location.state?.tempToken) {
      setToken(location.state.tempToken);
    }
    
    if (urlProvider) {
      setProvider(urlProvider);
    } else if (location.state?.provider) {
      setProvider(location.state.provider);
    }
    
    if (!urlToken && !location.state?.tempToken) {
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !code) {
      setError('Código 2FA inválido');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Verify 2FA code
      const response = await authApi.verify2FA(token, code);
      
      // Update user and tokens
      await setUserAndTokens(response.access_token, response.expires_in);
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Error verifying 2FA:', err);
      setError((err as Error).message || 'Código 2FA inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/login');
  };

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Verificación de dos factores</h2>
        <p className="mb-6 text-gray-600">
          Por favor, introduce el código de verificación de tu aplicación de autenticación.
          {provider && ` Estás iniciando sesión con ${provider}.`}
        </p>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Código de verificación
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="code"
                name="code"
				className="block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Ingresa el código de 6 dígitos"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                required
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              El código de verificación de 6 dígitos de tu aplicación de autenticación.
            </p>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              disabled={loading || code.length !== 6}
            >
              {loading ? <Spinner size="sm" className="border-white" /> : 'Verificar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorAuth;