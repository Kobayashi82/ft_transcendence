import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const GoogleCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Parse the URL query parameters
    const query = new URLSearchParams(location.search);
    
    // If there's an error parameter, display it
    if (query.get('error')) {
      setError(query.get('error'));
      setLoading(false);
      return;
    }
    
    // Process the callback response from the server
    const processCallback = async () => {
      try {
        // The backend has already handled the OAuth flow and will return either:
        // 1. A JSON response with tokens
        // 2. A JSON response indicating 2FA is required
        
        // Extract the response data from the URL (for demo only, in production this would be a real API call)
        const response = await fetch(window.location.href);
        const data = await response.json();
        
        if (data.requires_2fa) {
          // User needs to verify 2FA
          setRequires2FA(true);
          setTempToken(data.temp_token);
        } else {
          // Authentication successful
          localStorage.setItem('auth_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          
          // Redirect to dashboard
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error processing callback:', err);
        setError('Failed to complete authentication. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    processCallback();
  }, [location, navigate]);
  
  // Handle 2FA verification
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tempToken || !verificationCode) {
      return;
    }
    
    setLoading(true);
    
    try {
      // This would normally be a real API call to verify the 2FA code
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: tempToken,
          code: verificationCode
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.message || 'Invalid verification code');
        setLoading(false);
        return;
      }
      
      // Store tokens
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error verifying 2FA:', err);
      setError('Failed to verify code. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle redirect back to login
  const handleCancel = () => {
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-lg font-medium text-gray-700">Completing authentication with Google...</p>
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
            onClick={handleCancel}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }
  
  if (requires2FA) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">Two-Factor Authentication</h2>
          <p className="mb-6 text-gray-600">Please enter the verification code from your authenticator app.</p>
          
          <form onSubmit={handleVerify2FA}>
            <div className="mb-4">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                disabled={verificationCode.length !== 6}
              >
                Verify
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // Default loading state (should not reach here, but just in case)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Spinner size="lg" />
    </div>
  );
};

export default GoogleCallback;