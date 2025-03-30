import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Shield,
  Globe,
  Smartphone,
  Sliders,
} from "lucide-react";
import ProfilePanel from "./Profile";
import SecurityPanel from "./Security";
import ConnectionsPanel from "./Connections";
import DevicesPanel from "./Devices";
import SettingsPanel from "./Settings";
import AchievementsSection from "./Achievements";

// Mock user data - Replace with your actual data fetching logic
export const mockUserData = {
  id: "12345",
  username: "alex_player42",
  email: "alex@example.com",
  fullName: "Alex Johnson",
  avatar: "", // URL to avatar image, empty for now
  joinedDate: "2023-06-15",
  location: "Paris, France",
  bio: "Passionate about gaming and coding. Always up for a challenge!",
  socialLinks: {
    github: "github.com/alexj",
    website: "alexj.dev",
  },
  achievements: [
    {
      id: 1,
      name: "First Win",
      description: "Won your first game",
      icon: "🏆",
      unlocked: true,
    },
    {
      id: 2,
      name: "Winning Streak",
      description: "Won 5 games in a row",
      icon: "🔥",
      unlocked: true,
    },
    {
      id: 3,
      name: "Champion",
      description: "Won a tournament",
      icon: "👑",
      unlocked: false,
    },
  ],
  twoFactorEnabled: true,
};

// Dashboard tabs as routes
export const TABS = {
  PROFILE: "", // Default route for dashboard
  SECURITY: "security",
  CONNECTIONS: "connections",
  DEVICES: "devices",
  SETTINGS: "settings",
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(mockUserData);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract current active tab from URL
  const getCurrentTab = () => {
    const path = location.pathname.split("/").filter(Boolean);
    if (path.length <= 1) return TABS.PROFILE; // Just /dashboard
    return path[1]; // /dashboard/security -> "security"
  };

  const activeTab = getCurrentTab();

  // Simulate loading user data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute w-96 h-96 bg-indigo-500 rounded-full opacity-10 blur-3xl top-20 -left-48"></div>
        <div className="absolute w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl bottom-20 right-0"></div>
      </div>

      <div className="container-custom relative z-10 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-indigo-300">
            Manage your account, profile, and game settings
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
              {/* Profile header with avatar */}
              <div className="p-6 text-center border-b border-gray-800">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-indigo-500 mx-auto">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-900/30">
                        <User size={40} className="text-indigo-300" />
                      </div>
                    )}
                  </div>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">
                  {user.username}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{user.fullName}</p>
              </div>

              {/* Navigation */}
              <nav className="p-4">
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/dashboard"
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.PROFILE
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <User size={18} className="mr-2" />
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/security"
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.SECURITY
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Shield size={18} className="mr-2" />
                      Security
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/connections"
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.CONNECTIONS
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Globe size={18} className="mr-2" />
                      Connections
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/devices"
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.DEVICES
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Smartphone size={18} className="mr-2" />
                      Devices
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/settings"
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.SETTINGS
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Sliders size={18} className="mr-2" />
                      Settings
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Bottom actions */}
              <div className="p-4 border-t border-gray-800">
                <button className="w-full text-left px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 flex items-center">
                  <LogOut size={18} className="mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main content with routes */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <ProfilePanel user={user} setUser={setUser} />
                      <AchievementsSection achievements={user.achievements} />
                    </>
                  }
                />
                <Route
                  path="/security"
                  element={<SecurityPanel user={user} />}
                />
                <Route path="/connections" element={<ConnectionsPanel />} />
                <Route path="/devices" element={<DevicesPanel />} />
                <Route path="/settings" element={<SettingsPanel />} />

                {/* Redirect any other dashboard path to the profile page */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
