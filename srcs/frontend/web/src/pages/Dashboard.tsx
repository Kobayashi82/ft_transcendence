import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, User as UserIcon, Smartphone, Clock, Shield, 
  Settings, Bell, Home, RefreshCw
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { DeviceInfo, authApi } from '../services/api';
import MainLayout from '../components/MainLayout';
import DevicesTable from '../components/DevicesTable';
import UserInfoCards from '../components/UserInfoCards';
import { useToast } from '../components/ToastContext';
import ConfirmationModal from '../components/ConfirmationModal';
import SecuritySettings from '../components/SecuritySettings';

const Dashboard: React.FC = () => {
  const { user, logout, loading, setUserAndTokens } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [refreshingDevices, setRefreshingDevices] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);

  // Process tokens from URL directly in Dashboard as a backup
  const processURLTokens = useCallback(async () => {
    try {
      const params = new URLSearchParams(location.search);
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');
      
      if (token) {
        console.log("Dashboard: Processing token from URL...");
        await setUserAndTokens(
          token, 
          expiresIn ? parseInt(expiresIn) : undefined
        );
        
        // Clean URL for security
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error("Error processing token from URL:", err);
      showToast({
        type: 'error',
        message: 'Failed to authenticate. Please try logging in again.'
      });
    }
  }, [location, navigate, setUserAndTokens, showToast]);
  
  // Load user devices
  const loadDevices = useCallback(async (showRefreshing = false) => {
    if (!user) return;
    
    if (showRefreshing) {
      setRefreshingDevices(true);
    } else {
      setLoadingDevices(true);
    }
    
    try {
      const userWithDevices = await authApi.getCurrentUser();
      if (userWithDevices.devices) {
        setDevices(userWithDevices.devices);
      }
    } catch (err) {
      console.error("Error loading devices:", err);
      showToast({
        type: 'error',
        message: 'Failed to load devices. Please try again.'
      });
    } finally {
      setLoadingDevices(false);
      setRefreshingDevices(false);
    }
  }, [user, showToast]);
  
  // Confirm device revocation
  const confirmRevokeDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowRevokeModal(true);
  };
  
  // Revoke device
  const revokeDevice = async () => {
    if (!selectedDeviceId) return;
    
    setRevokeLoading(true);
    
    try {
      await authApi.revokeDevice(selectedDeviceId);
      // Reload devices
      await loadDevices();
      showToast({
        type: 'success',
        message: 'Device revoked successfully'
      });
    } catch (err) {
      console.error("Error revoking device:", err);
      showToast({
        type: 'error',
        message: 'Failed to revoke device. Please try again.'
      });
    } finally {
      setRevokeLoading(false);
      setShowRevokeModal(false);
      setSelectedDeviceId(null);
    }
  };

  // Logout from all devices
  const logoutAllDevices = async () => {
    setLogoutAllLoading(true);
    
    try {
      // Make API call to logout all sessions except current
      await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      showToast({
        type: 'success',
        message: 'Logged out from all other devices'
      });
      
      // Reload devices to show only current device
      await loadDevices();
    } catch (err) {
      console.error("Error logging out all devices:", err);
      showToast({
        type: 'error',
        message: 'Failed to logout from all devices. Please try again.'
      });
    } finally {
      setLogoutAllLoading(false);
      setShowLogoutAllModal(false);
    }
  };
  
  // Run when component mounts and when URL changes
  useEffect(() => {
    processURLTokens();
  }, [processURLTokens]);
  
  // Load devices when user is available
  useEffect(() => {
    if (user) {
      loadDevices();
    }
  }, [user, loadDevices]);
  
  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        type: 'success',
        message: 'Logged out successfully'
      });
    } catch (err) {
      console.error("Error logging out:", err);
      showToast({
        type: 'error',
        message: 'Failed to log out. Please try again.'
      });
    }
  };

  // Handle security settings actions
  const handleEnable2FA = () => {
    navigate('/settings?tab=security');
  };

  const handleDisable2FA = () => {
    navigate('/settings?tab=security');
  };

  const handleChangePassword = () => {
    navigate('/settings?tab=password');
  };
  
  // Detect current device
  const getCurrentDeviceId = (): string | null => {
	return sessionStorage.getItem('device_id');
  };
  
  // Show spinner while loading user data
  if (loading || !user) {
	return (
	  <div className="flex h-screen w-full items-center justify-center">
		<Spinner size="lg" />
	  </div>
	);
  }
  
  return (
    <MainLayout title="Dashboard">
      {/* Tab buttons */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Home className="inline-block mr-2 h-5 w-5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'devices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smartphone className="inline-block mr-2 h-5 w-5" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline-block mr-2 h-5 w-5" />
            Security
          </button>
        </div>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.username}!</h2>
            <p className="text-gray-600 mb-6">
              You've successfully logged in to your account. Here's a summary of your account information.
            </p>
            
            <UserInfoCards user={user} sessionsCount={devices.length} />
            
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => setActiveTab('devices')}
                  className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                  Manage Devices
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Shield className="h-4 w-4 mr-2 text-gray-500" />
                  Security Settings
                </button>
                <button 
                  className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  Account Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Devices</h2>
              <button 
                onClick={() => loadDevices(true)}
                className="inline-flex items-center justify-center bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={refreshingDevices}
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-gray-500 ${refreshingDevices ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              These are the devices that are currently logged into your account. You can revoke access to any device except the current one.
            </p>
            
            <DevicesTable 
              devices={devices}
              currentDeviceId={getCurrentDeviceId()}
              loading={loadingDevices}
              onRevokeDevice={confirmRevokeDevice}
            />

            <div className="mt-6 flex">
              <button
                onClick={() => setShowLogoutAllModal(true)}
                className="inline-flex items-center justify-center bg-red-100 text-red-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout from All Other Devices
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Security Tab */}
      {activeTab === 'security' && (
        <SecuritySettings
          user={user}
          onEnable2FA={handleEnable2FA}
          onDisable2FA={handleDisable2FA}
          onChangePassword={handleChangePassword}
          onLogoutAllDevices={() => setShowLogoutAllModal(true)}
          onManageDevices={() => setActiveTab('devices')}
          loading={false}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        title="Revoke Device Access"
        message="Are you sure you want to revoke access for this device? This will log out all sessions associated with it."
        confirmButtonText="Revoke Access"
        isDestructive={true}
        isLoading={revokeLoading}
        onConfirm={revokeDevice}
        onCancel={() => setShowRevokeModal(false)}
      />

      <ConfirmationModal
        isOpen={showLogoutAllModal}
        title="Logout from All Devices"
        message="Are you sure you want to log out from all other devices? This will terminate all active sessions except your current one."
        confirmButtonText="Logout All Devices"
        isDestructive={true}
        isLoading={logoutAllLoading}
        onConfirm={logoutAllDevices}
        onCancel={() => setShowLogoutAllModal(false)}
      />
    </MainLayout>
  );
};

export default Dashboard;