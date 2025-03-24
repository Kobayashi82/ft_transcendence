
import React, { useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ToastContext';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const Register: React.FC = () => {
  const { register: registerUser, loading, error, isAuthenticated, clearError } = useAuth();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  
  // Validate form data
  const validateForm = (): boolean => {
	// Clear previous errors
	setPasswordError('');
	
	// Validate password match
	if (password !== confirmPassword) {
	  setPasswordError('Passwords do not match');
	  return false;
	}
	
	// Validate password strength
	const hasLowercase = /[a-z]/.test(password);
	const hasUppercase = /[A-Z]/.test(password);
	const hasNumber = /\d/.test(password);
	const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
	const isLongEnough = password.length >= 8;

	if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar || !isLongEnough) {
	  setPasswordError(
		'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*(),.?":{}|<>)'
	  );
	  return false;
	}
	
	return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
	e.preventDefault();
	
	if (!validateForm()) {
	  return;
	}
	
	if (email && username && password) {
	  try {
		await registerUser(email, username, password);
		showToast({
		  type: 'success',
		  message: 'Registration successful! Welcome to the application.'
		});
	  } catch (error) {
		showToast({
		  type: 'error',
		  message: error instanceof Error ? error.message : 'Registration failed'
		});
	  }
	}
  };
  
  // Handle Google OAuth
  const handleGoogleLogin = async () => {
	try {
	  setOauthLoading(true);
	  setOauthProvider('google');
	  const url = await authApi.getGoogleOAuthURL();
	  window.location.href = url;
	} catch (error) {
	  console.error('Failed to get Google OAuth URL', error);
	  setOauthLoading(false);
	  setOauthProvider(null);
	  showToast({
		type: 'error',
		message: 'Failed to connect to Google. Please try again later.'
	  });
	}
  };
  
  // Handle 42 OAuth
  const handle42Login = async () => {
	try {
	  setOauthLoading(true);
	  setOauthProvider('42');
	  const url = await authApi.get42OAuthURL();
	  window.location.href = url;
	} catch (error) {
	  console.error('Failed to get 42 OAuth URL', error);
	  setOauthLoading(false);
	  setOauthProvider(null);
	  showToast({
		type: 'error',
		message: 'Failed to connect to 42. Please try again later.'
	  });
	}
  };
  
  // Redirect if already authenticated
  if (isAuthenticated) {
	return <Navigate to="/dashboard" replace />;
  }
  
  return (
	<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
	  <div className="w-full max-w-md space-y-8">
		<div>
		  <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
			Create a new account
		  </h2>
		  <p className="mt-2 text-center text-sm text-gray-600">
			Or{' '}
			<Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
			  sign in to your existing account
			</Link>
		  </p>
		</div>
		
		{error && (
		  <div className="rounded-md bg-red-50 p-4">
			<div className="flex">
			  <div className="flex-shrink-0">
				<AlertCircle className="h-5 w-5 text-red-400" />
			  </div>
			  <div className="ml-3">
				<h3 className="text-sm font-medium text-red-800">{error}</h3>
			  </div>
			  <div className="ml-auto pl-3">
				<div className="-mx-1.5 -my-1.5">
				  <button
					type="button"
					onClick={clearError}
					className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
				  >
					<span className="sr-only">Dismiss</span>
					<span className="h-5 w-5" aria-hidden="true">×</span>
				  </button>
				</div>
			  </div>
			</div>
		  </div>
		)}
		
		<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
		  <div className="-space-y-px rounded-md shadow-sm">
			<div>
			  <label htmlFor="email-address" className="sr-only">
				Email address
			  </label>
			  <div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				  <Mail className="h-5 w-5 text-gray-400" />
				</div>
				<input
				  id="email-address"
				  name="email"
				  type="email"
				  autoComplete="email"
				  required
				  className="block w-full rounded-t-md border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
				  placeholder="Email address"
				  value={email}
				  onChange={(e) => setEmail(e.target.value)}
				  disabled={loading || oauthLoading}
				/>
			  </div>
			</div>
			
			<div>
			  <label htmlFor="username" className="sr-only">
				Username
			  </label>
			  <div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				  <User className="h-5 w-5 text-gray-400" />
				</div>
				<input
				  id="username"
				  name="username"
				  type="text"
				  autoComplete="username"
				  required
				  className="block w-full border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
				  placeholder="Username"
				  value={username}
				  onChange={(e) => setUsername(e.target.value)}
				  disabled={loading || oauthLoading}
				/>
			  </div>
			</div>
			
			<div>
			  <label htmlFor="password" className="sr-only">
				Password
			  </label>
			  <div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				  <Lock className="h-5 w-5 text-gray-400" />
				</div>
				<input
				  id="password"
				  name="password"
				  type={showPassword ? 'text' : 'password'}
				  autoComplete="new-password"
				  required
				  className="block w-full border-0 py-3 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
				  placeholder="Password"
				  value={password}
				  onChange={(e) => setPassword(e.target.value)}
				  disabled={loading || oauthLoading}
				/>
				<div className="absolute inset-y-0 right-0 flex items-center pr-3">
				  <button
					type="button"
					onClick={() => setShowPassword(!showPassword)}
					className="text-gray-400 hover:text-gray-500"
					tabIndex={-1}
				  >
					{showPassword ? (
					  <EyeOff className="h-5 w-5" />
					) : (
					  <Eye className="h-5 w-5" />
					)}
				  </button>
				</div>
			  </div>
			  
			  {/* Password strength meter */}
			  {password && <PasswordStrengthMeter password={password} className="mx-2" />}
			</div>
			
			<div>
			  <label htmlFor="confirm-password" className="sr-only">
				Confirm password
			  </label>
			  <div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				  <Lock className="h-5 w-5 text-gray-400" />
				</div>
				<input
				  id="confirm-password"
				  name="confirm-password"
				  type={showPassword ? 'text' : 'password'}
				  autoComplete="new-password"
				  required
				  className="block w-full rounded-b-md border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
				  placeholder="Confirm password"
				  value={confirmPassword}
				  onChange={(e) => setConfirmPassword(e.target.value)}
				  disabled={loading || oauthLoading}
				/>
			  </div>
			</div>
		  </div>
		  
		  {passwordError && (
			<div className="text-sm text-red-600">{passwordError}</div>
		  )}

		  <div className="text-sm">
			<p className="text-gray-600">
			  By registering, you agree to our{' '}
			  <Link to="/terms" className="font-medium text-blue-600 hover:text-blue-500">
				Terms of Service
			  </Link>{' '}
			  and{' '}
			  <Link to="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
				Privacy Policy
			  </Link>
			</p>
		  </div>

		  <div>
			<button
			  type="submit"
			  disabled={loading || oauthLoading}
			  className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400"
			>
			  {loading ? <Spinner size="sm" className="border-white" /> : 'Sign up'}
			</button>
		  </div>
		</form>
		
		<div className="mt-6">
		  <div className="relative">
			<div className="absolute inset-0 flex items-center">
			  <div className="w-full border-t border-gray-300"></div>
			</div>
			<div className="relative flex justify-center text-sm">
			  <span className="bg-gray-100 px-2 text-gray-500">Or continue with</span>
			</div>
		  </div>

		  <div className="mt-6 grid grid-cols-2 gap-3">
		  // Continuing from where the file was cut off - the Google OAuth button:
			<button
			  type="button"
			  onClick={handleGoogleLogin}
			  disabled={loading || oauthLoading}
			  className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-70"
			>
			  {oauthLoading && oauthProvider === 'google' ? (
				<Spinner size="sm" />
			  ) : (
				<>
				  <svg className="h-5 w-5" viewBox="0 0 24 24">
					<path
					  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					  fill="#4285F4"
					/>
					<path
					  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					  fill="#34A853"
					/>
					<path
					  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					  fill="#FBBC05"
					/>
					<path
					  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					  fill="#EA4335"
					/>
				  </svg>
				  <span>Google</span>
				</>
			  )}
			</button>

			<button
			  type="button"
			  onClick={handle42Login}
			  disabled={loading || oauthLoading}
			  className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-70"
			>
			  {oauthLoading && oauthProvider === '42' ? (
				<Spinner size="sm" />
			  ) : (
				<>
				  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path fillRule="evenodd" d="M10 0c5.523 0 10 4.477 10 10s-4.477 10-10 10S0 15.523 0 10 4.477 0 10 0zm0 2a8 8 0 100 16 8 8 0 000-16zm-2 6a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1v-4z" clipRule="evenodd" />
				  </svg>
				  <span>42</span>
				</>
			  )}
			</button>
		  </div>
		</div>
	  </div>
	</div>
  );
};

export default Register;