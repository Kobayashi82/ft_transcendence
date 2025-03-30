import React from "react";
import { Link } from "react-router-dom";
import {
  LogOut,
  Settings,
  UserCircle,
  User,
  ChevronDown,
  Shield,
} from "lucide-react";
import useUserProfile from "../../hooks/useUserProfile";

interface ProfileMenuProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isMobile = false,
  onClose,
}) => {
  const {
    user,
    loading,
    isProfileMenuOpen,
    toggleProfileMenu,
    closeProfileMenu,
    handleLogout,
  } = useUserProfile();

  if (loading || !user) {
    return null; // O muestra un estado de carga
  }

  // Versión Desktop
  if (!isMobile) {
    return (
      <div className="relative">
        <button
          id="profile-button"
          onClick={toggleProfileMenu}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-gray-700 hover:border-indigo-500 transition-colors bg-gray-800 flex items-center justify-center overflow-hidden">
              {/* Simple profile silhouette icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-8 h-8 text-gray-400"
              >
                <path
                  d="M12 2C9.38 2 7.25 4.13 7.25 6.75C7.25 9.32 9.26 11.4 11.88 11.49C11.96 11.48 12.04 11.48 12.1 11.49C12.12 11.49 12.13 11.49 12.15 11.49C14.73 11.4 16.74 9.32 16.75 6.75C16.75 4.13 14.62 2 12 2Z"
                  fill="currentColor"
                />
                <path
                  d="M17.08 14.15C14.29 12.29 9.74 12.29 6.93 14.15C5.66 15 4.96 16.15 4.96 17.38C4.96 18.61 5.66 19.75 6.92 20.59C8.32 21.53 10.16 22 12 22C13.84 22 15.68 21.53 17.08 20.59C18.34 19.74 19.04 18.6 19.04 17.36C19.03 16.13 18.34 14.99 17.08 14.15Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            {user.isAdmin && (
              <span
                className="absolute -top-1 -right-1 bg-indigo-500 p-1 rounded-full border-2 border-gray-900"
                title="Admin"
              >
                <Shield size={10} className="text-white" />
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center text-sm font-medium text-gray-200 hover:text-white">
              <span className="max-w-[100px] truncate">{user.username}</span>
              <ChevronDown size={16} className="ml-1" />
            </div>
            {user.isGuest && (
              <span className="text-xs text-gray-400">Guest</span>
            )}
          </div>
        </button>

        {/* Menú desplegable de perfil */}
        {isProfileMenuOpen && (
          <div
            id="profile-menu"
            className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-700">
              <p className="text-sm font-medium text-white">{user.username}</p>
              {user.isAdmin && (
                <div className="flex items-center mt-1">
                  <Shield size={12} className="text-indigo-400 mr-1" />
                  <span className="text-xs text-indigo-400">Admin</span>
                </div>
              )}
              {user.isGuest && (
                <div className="flex items-center mt-1">
                  <User size={12} className="text-gray-400 mr-1" />
                  <span className="text-xs text-gray-400">Guest Account</span>
                </div>
              )}
            </div>
            <div className="py-1">
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={closeProfileMenu}
              >
                <UserCircle size={16} className="mr-2" />
                Your Profile
              </Link>
              <Link
                to="/dashboard/settings"
                className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={closeProfileMenu}
              >
                <Settings size={16} className="mr-2" />
                Settings
              </Link>
              {user.isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                  onClick={closeProfileMenu}
                >
                  <Shield size={16} className="mr-2" />
                  Admin Dashboard
                </Link>
              )}
            </div>
            <div className="py-1 border-t border-gray-700">
              {user.isGuest ? (
                <>
                  <Link
                    to="/login"
                    className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={closeProfileMenu}
                  >
                    <LogOut size={16} className="mr-2" />
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center px-4 py-2 text-sm text-indigo-400 hover:bg-gray-700 hover:text-indigo-300 transition-colors"
                    onClick={closeProfileMenu}
                  >
                    <User size={16} className="mr-2" />
                    Create Account
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión Mobile
  return (
    <>
      {/* User Profile Card for Mobile */}
      <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden">
            {/* Simple profile silhouette icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-9 h-9 text-gray-400"
            >
              <path
                d="M12 2C9.38 2 7.25 4.13 7.25 6.75C7.25 9.32 9.26 11.4 11.88 11.49C11.96 11.48 12.04 11.48 12.1 11.49C12.12 11.49 12.13 11.49 12.15 11.49C14.73 11.4 16.74 9.32 16.75 6.75C16.75 4.13 14.62 2 12 2Z"
                fill="currentColor"
              />
              <path
                d="M17.08 14.15C14.29 12.29 9.74 12.29 6.93 14.15C5.66 15 4.96 16.15 4.96 17.38C4.96 18.61 5.66 19.75 6.92 20.59C8.32 21.53 10.16 22 12 22C13.84 22 15.68 21.53 17.08 20.59C18.34 19.74 19.04 18.6 19.04 17.36C19.03 16.13 18.34 14.99 17.08 14.15Z"
                fill="currentColor"
              />
            </svg>
          </div>
          {user.isAdmin && (
            <span
              className="absolute -top-1 -right-1 bg-indigo-500 p-1 rounded-full border-2 border-gray-900"
              title="Admin"
            >
              <Shield size={10} className="text-white" />
            </span>
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-white flex items-center">
            {user.username}
            {user.isAdmin && (
              <Shield size={14} className="ml-1 text-indigo-400" />
            )}
          </div>
          {user.isGuest && (
            <span className="text-xs text-gray-400">Guest Account</span>
          )}
        </div>
      </div>

      {/* Mobile Profile Actions */}
      <div className="space-y-2">
        <Link
          to="/dashboard"
          className="flex items-center p-3 bg-gray-800 rounded-lg text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          onClick={onClose}
        >
          <UserCircle size={18} className="mr-3" />
          Your Profile
        </Link>
        <Link
          to="/dashboard/settings"
          className="flex items-center p-3 bg-gray-800 rounded-lg text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          onClick={onClose}
        >
          <Settings size={18} className="mr-3" />
          Settings
        </Link>
        {user.isAdmin && (
          <Link
            to="/admin"
            className="flex items-center p-3 bg-gray-800 rounded-lg text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
            onClick={onClose}
          >
            <Shield size={18} className="mr-3" />
            Admin Dashboard
          </Link>
        )}
        {user.isGuest ? (
          <>
            <Link
              to="/login"
              className="flex items-center p-3 bg-gray-800 rounded-lg text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={onClose}
            >
              <LogOut size={18} className="mr-3" />
              Log In
            </Link>
            <Link
              to="/register"
              className="flex items-center p-3 bg-indigo-900/50 rounded-lg text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors"
              onClick={onClose}
            >
              <User size={18} className="mr-3" />
              Create Account
            </Link>
          </>
        ) : (
          <button
            onClick={() => {
              handleLogout();
              if (onClose) onClose();
            }}
            className="flex w-full items-center p-3 bg-gray-800 rounded-lg text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sign out
          </button>
        )}
      </div>
    </>
  );
};

export default ProfileMenu;
