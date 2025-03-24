import React from 'react';
import { User } from '../services/api';
import { Shield, Clock, Mail, Calendar } from 'lucide-react';

interface UserInfoCardProps {
  user: User;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({ user }) => {
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
              <p className="mt-1 text-sm text-gray-900">{user.account_type || 'Standard'}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
              <p className="mt-1 text-sm text-gray-900">{formatDate(user.last_login)}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
              <p className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-5">
          <h3 className="text-sm font-medium text-gray-500">Roles</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {user.roles?.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
        
        <div className="mt-5">
          <h3 className="text-sm font-medium text-gray-500">Security Status</h3>
          <div className="mt-1">
            {user.has_2fa ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                2FA Enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                2FA Disabled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;