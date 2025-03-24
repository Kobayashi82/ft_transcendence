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
    console.log(`OAuth callback initiated for provider: ${provider}`);
    
    const processCallback = async () => {
      try {
        // Get URL parameters
        const params = new URLSearchParams(location.search);
        
        // Check if there's an access token directly in the URL (sent by server)
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (accessToken) {
          console.log("Processing access token from URL");
          
          // Save token and get user info
          await setUserAndTokens(
            accessToken, 
            expiresIn ? parseInt(expiresIn) : undefined
          );
          
          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Check for errors in URL
        const errorCode = params.get('error');
        if (errorCode) {
          const errorMessage = params.get('error_description') || 'Authentication error';
          throw new Error(decodeURIComponent(errorMessage));
        }
        
        // If we get here and don't have a token, something went wrong
        // Try navigating to dashboard to see if a cookie was set
        console.log("No token found in URL, trying to continue to dashboard");
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Error in OAuth callback:', err);
        setError((err as Error).message || 'Authentication error');
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
            Completing authentication with {provider}...
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
            <h2 className="text-2xl font-bold">Authentication Error</h2>
          </div>
          <p className="mb-6 text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }
  
  return null;
};

export default OAuthCallback;