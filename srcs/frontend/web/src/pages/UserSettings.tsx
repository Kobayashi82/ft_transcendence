import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User as UserIcon, Shield, Key, Mail, Save, 
  ArrowLeft, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const UserSettings: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Handle profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    
    try {
      // Here you would implement the API call to update the profile
      // await userApi.updateUserProfile({ username, email });
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return;
    }
    
    setSaving(true);
    
    try {
      // Here you would implement the API call to change the password
      // await authApi.changePassword(currentPassword, newPassword);
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setSuccess('Password changed successfully');
    } catch (err) {
      setError((err as Error).message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle 2FA toggle
  const handleEnable2FA = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    
    try {
      // Here you would implement the API call to enable 2FA
      // await authApi.enable2FA();
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('2FA setup initiated');
      
      // In a real implementation, you would redirect to a 2FA setup page
      // navigate('/setup-2fa');
    } catch (err) {
      setError((err as Error).message || 'Failed to enable 2FA');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    setError(null);
    setSaving(true);
    
    try {
      // Here you would implement the API call to delete the account
      // await authApi.deleteAccount();
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to login
      navigate('/login');
    } catch (err) {
      setError((err as Error).message || 'Failed to delete account');
      setSaving(false);
    }
  };
  
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your account preferences and security</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
            {/* Sidebar */}
            <aside className="py-6 lg:col-span-3">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium w-full ${
                    activeTab === 'profile'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <UserIcon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      activeTab === 'profile' ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  Profile
                </button>

                <button
                  onClick={() => setActiveTab('password')}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium w-full ${
                    activeTab === 'password'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Key
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      activeTab === 'password' ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  Password
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium w-full ${
                    activeTab === 'security'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Shield
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      activeTab === 'security' ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  Security
                </button>
              </div>
            </aside>

            {/* Content area */}
            <div className="space-y-6 lg:col-span-9">
              {/* Notification messages */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Settings */}
              {activeTab === 'profile' && (
                <div className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your account information
                    </p>
                    <form onSubmit={handleProfileSave} className="mt-5">
                      <div className="space-y-5">
                        <div>
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                            Username
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="username"
                              id="username"
                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="email"
                              id="email"
                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="pt-5">
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <Spinner size="sm" className="mr-2 border-white" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Password Settings */}
              {activeTab === 'password' && (
                <div className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Change Password</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your password to keep your account secure
                    </p>
                    <form onSubmit={handlePasswordChange} className="mt-5">
                      <div className="space-y-5">
                        <div>
                          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                            Current Password
                          </label>
                          <div className="relative mt-1">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              name="current-password"
                              id="current-password"
                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm pr-10"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                              disabled={saving}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-5 w-5" aria-hidden="true" />
                              ) : (
                                <Eye className="h-5 w-5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                            New Password
                          </label>
                          <div className="relative mt-1">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              name="new-password"
                              id="new-password"
                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm pr-10"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              disabled={saving}
                              minLength={8}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-5 w-5" aria-hidden="true" />
                              ) : (
                                <Eye className="h-5 w-5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Password must be at least 8 characters and include uppercase, lowercase, number, and special character
                          </p>
                        </div>

                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                            Confirm New Password
                          </label>
                          <div className="mt-1">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              name="confirm-password"
                              id="confirm-password"
                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="pt-5">
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <Spinner size="sm" className="mr-2 border-white" />
                                  Updating...
                                </>
                              ) : (
                                'Update Password'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* 2FA Section */}
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-medium leading-6 text-gray-900">Two-Factor Authentication</h2>
                          <p className="mt-1 text-sm text-gray-500">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <div>
                          {user.has_2fa ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        {user.has_2fa ? (
                          <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            disabled={saving}
                          >
                            {saving ? <Spinner size="sm" className="mr-2 border-white" /> : null}
                            Disable 2FA
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            onClick={handleEnable2FA}
                            disabled={saving}
                          >
                            {saving ? <Spinner size="sm" className="mr-2 border-white" /> : null}
                            Enable 2FA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sessions Management */}
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h2 className="text-lg font-medium leading-6 text-gray-900">Session Management</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        View and manage your active sessions
                      </p>
                      <div className="mt-5">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          onClick={() => navigate('/dashboard')}
                        >
                          Manage Sessions
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Account Deletion */}
                  <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium leading-6 text-red-800">Delete Account</h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
                        </p>
                      </div>
                      <div className="mt-5">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 sm:text-sm disabled:opacity-50"
                          onClick={handleDeleteAccount}
                          disabled={saving}
                        >
                          {saving ? <Spinner size="sm" className="mr-2" /> : null}
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserSettings;