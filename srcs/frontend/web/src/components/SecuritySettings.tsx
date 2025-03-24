import React from 'react';
import { User } from '../services/api';
import Spinner from './ui/Spinner';

interface SecuritySettingsProps {
  user: User;
  onEnable2FA: () => void;
  onDisable2FA: () => void;
  onChangePassword: () => void;
  onLogoutAllDevices: () => void;
  onManageDevices: () => void;
  loading: boolean;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  user,
  onEnable2FA,
  onDisable2FA,
  onChangePassword,
  onLogoutAllDevices,
  onManageDevices,
  loading
}) => {
  return (
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-4 sm:mb-0">
                  <p className="text-sm text-gray-700">
                    Two-factor authentication is currently enabled. This helps keep your account secure.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDisable2FA}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" className="mr-2 border-white" /> : null}
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-4 sm:mb-0">
                  <p className="text-sm text-gray-700">
                    Two-factor authentication is currently disabled. Enable it to add an extra layer of security.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEnable2FA}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" className="mr-2 border-white" /> : null}
                  Enable 2FA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Password</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <p className="text-sm text-gray-700">
                  Change your password to keep your account secure. We recommend using a strong, unique password.
                </p>
              </div>
              <button 
                onClick={onChangePassword}
                className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Session Management</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Manage your active sessions across devices. You can view and revoke access to your account.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onManageDevices}
                className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Manage Devices
              </button>
              <button 
                onClick={onLogoutAllDevices}
                className="inline-flex items-center justify-center bg-red-100 text-red-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-200"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Logout from All Devices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;