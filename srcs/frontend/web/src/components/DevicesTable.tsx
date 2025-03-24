import React from 'react';
import { DeviceInfo } from '../services/api';
import { Smartphone, Laptop, Monitor, Server, RefreshCw, AlertCircle } from 'lucide-react';
import Spinner from './ui/Spinner';

interface DevicesTableProps {
  devices: DeviceInfo[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRevoke: (deviceId: string) => void;
  currentDeviceId?: string;
}

const DevicesTable: React.FC<DevicesTableProps> = ({ 
  devices, 
  loading, 
  refreshing, 
  onRefresh, 
  onRevoke,
  currentDeviceId 
}) => {
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };
  
  // Format time elapsed
  const formatTimeElapsed = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // Return empty string for future dates
      if (diffMs < 0) return '';
      
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      } else {
        return 'Just now';
      }
    } catch (e) {
      return '';
    }
  };
  
  // Get device icon based on type
  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-5 w-5 text-purple-500" />;
      case 'windows':
      case 'mac':
        return <Laptop className="h-5 w-5 text-blue-500" />;
      case 'linux':
        return <Server className="h-5 w-5 text-orange-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-400" />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (devices.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No devices found</h3>
        <p className="text-gray-500 mb-4">We couldn't find any active devices for your account.</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
          Refresh
        </button>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-4">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`-ml-0.5 mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Device
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {devices.map((device) => {
            const isCurrentDevice = currentDeviceId && currentDeviceId === device.id;
            
            return (
              <tr key={device.id} className={isCurrentDevice ? "bg-blue-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getDeviceIcon(device.type)}
                    <div className="ml-4 max-w-xs truncate">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {device.name}
                      </div>
                      {isCurrentDevice && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Current Device
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm text-gray-900">{formatDate(device.last_used)}</div>
                    <div className="text-sm text-gray-500">{formatTimeElapsed(device.last_used)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                    {device.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {!isCurrentDevice ? (
                    <button
                      onClick={() => onRevoke(device.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Revoke Access
                    </button>
                  ) : (
                    <span className="text-gray-400">Current Session</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DevicesTable;