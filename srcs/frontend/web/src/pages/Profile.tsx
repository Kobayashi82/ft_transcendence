import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Settings,
  LogOut,
  Camera,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Info,
  Mail,
  Calendar,
  MapPin,
  Globe,
  Shield,
} from "lucide-react";

// Mock user data - Replace with your actual data fetching logic
const mockUserData = {
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

// Account tabs
const TABS = {
  PROFILE: "profile",
  SECURITY: "security",
  CONNECTIONS: "connections",
};

const Profile: React.FC = () => {
  const [user, setUser] = useState(mockUserData);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.PROFILE);
  const [editForm, setEditForm] = useState({
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    location: user.location,
    bio: user.bio,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  // Simulate loading user data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Start editing
  const handleEditClick = () => {
    setEditing(true);
    setEditForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      location: user.location,
      bio: user.bio,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update user state with form data
      setUser((prev) => ({
        ...prev,
        ...editForm,
        // If we have a new avatar preview, use it (this is temporary until real upload)
        avatar: avatarPreview || prev.avatar,
      }));

      // Reset editing state
      setEditing(false);
      setSaveStatus("success");

      // Reset success message after a delay
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setSaveStatus("error");
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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
          <h1 className="text-3xl font-bold text-white">Your Profile</h1>
          <p className="text-indigo-300">
            Manage your personal information and account settings
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
                    {user.avatar || avatarPreview ? (
                      <img
                        src={avatarPreview || user.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-900/30">
                        <User size={40} className="text-indigo-300" />
                      </div>
                    )}
                  </div>
                  {editing && (
                    <>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 border-2 border-gray-900 hover:bg-indigo-700 transition-colors"
                      >
                        <Camera size={14} className="text-white" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </>
                  )}
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
                    <button
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.PROFILE
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() => setActiveTab(TABS.PROFILE)}
                    >
                      <User size={18} className="mr-2" />
                      Profile Information
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.SECURITY
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() => setActiveTab(TABS.SECURITY)}
                    >
                      <Shield size={18} className="mr-2" />
                      Security
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                        activeTab === TABS.CONNECTIONS
                          ? "bg-indigo-600/20 text-indigo-300"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() => setActiveTab(TABS.CONNECTIONS)}
                    >
                      <Globe size={18} className="mr-2" />
                      Connections
                    </button>
                  </li>
                </ul>
              </nav>

              {/* Bottom actions */}
              <div className="p-4 border-t border-gray-800">
                <button className="w-full text-left px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center">
                  <Settings size={18} className="mr-2" />
                  Settings
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 flex items-center mt-1">
                  <LogOut size={18} className="mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
              {/* Profile tab content */}
              {activeTab === TABS.PROFILE && (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-800 p-6">
                    <h3 className="text-xl font-semibold text-white">
                      Profile Information
                    </h3>
                    {!editing ? (
                      <button
                        onClick={handleEditClick}
                        className="flex items-center text-indigo-400 hover:text-indigo-300 bg-gray-800 px-3 py-1 rounded-md"
                      >
                        <Edit2 size={16} className="mr-1" />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCancel}
                          className="text-gray-400 hover:text-gray-300 bg-gray-800 px-3 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form="profile-form"
                          className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md flex items-center"
                          disabled={saveStatus === "saving"}
                        >
                          {saveStatus === "saving" ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>Save Changes</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Save status message */}
                  {saveStatus === "success" && (
                    <div className="mx-6 mb-4 p-3 bg-green-900/30 border border-green-700 rounded-md text-green-300 text-sm flex items-center">
                      <CheckCircle size={16} className="mr-2" />
                      Profile updated successfully!
                    </div>
                  )}

                  {saveStatus === "error" && (
                    <div className="mx-6 mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-sm flex items-center">
                      <AlertTriangle size={16} className="mr-2" />
                      Failed to update profile. Please try again.
                    </div>
                  )}

                  <div className="p-6">
                    {editing ? (
                      // Edit form
                      <form
                        id="profile-form"
                        onSubmit={handleSubmit}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label
                              htmlFor="username"
                              className="block text-sm font-medium text-gray-300 mb-1"
                            >
                              Username
                            </label>
                            <input
                              type="text"
                              id="username"
                              name="username"
                              value={editForm.username}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="fullName"
                              className="block text-sm font-medium text-gray-300 mb-1"
                            >
                              Full Name
                            </label>
                            <input
                              type="text"
                              id="fullName"
                              name="fullName"
                              value={editForm.fullName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-300 mb-1"
                          >
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="location"
                            className="block text-sm font-medium text-gray-300 mb-1"
                          >
                            Location
                          </label>
                          <input
                            type="text"
                            id="location"
                            name="location"
                            value={editForm.location}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="bio"
                            className="block text-sm font-medium text-gray-300 mb-1"
                          >
                            Bio
                          </label>
                          <textarea
                            id="bio"
                            name="bio"
                            value={editForm.bio}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </form>
                    ) : (
                      // View profile
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Username
                            </h4>
                            <p className="mt-1 text-white">{user.username}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Full Name
                            </h4>
                            <p className="mt-1 text-white">{user.fullName}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Email Address
                          </h4>
                          <div className="mt-1 flex items-center">
                            <Mail size={16} className="text-gray-500 mr-2" />
                            <p className="text-white">{user.email}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Joined Date
                          </h4>
                          <div className="mt-1 flex items-center">
                            <Calendar
                              size={16}
                              className="text-gray-500 mr-2"
                            />
                            <p className="text-white">
                              {new Date(user.joinedDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Location
                          </h4>
                          <div className="mt-1 flex items-center">
                            <MapPin size={16} className="text-gray-500 mr-2" />
                            <p className="text-white">{user.location}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Bio
                          </h4>
                          <p className="mt-1 text-white">{user.bio}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Social Links
                          </h4>
                          <div className="mt-2 space-y-2">
                            {user.socialLinks.github && (
                              <div className="flex items-center">
                                <Globe
                                  size={16}
                                  className="text-gray-500 mr-2"
                                />
                                <a
                                  href={`https://${user.socialLinks.github}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  {user.socialLinks.github}
                                </a>
                              </div>
                            )}
                            {user.socialLinks.website && (
                              <div className="flex items-center">
                                <Globe
                                  size={16}
                                  className="text-gray-500 mr-2"
                                />
                                <a
                                  href={`https://${user.socialLinks.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  {user.socialLinks.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security tab content */}
              {activeTab === TABS.SECURITY && (
                <div>
                  <div className="border-b border-gray-800 p-6">
                    <h3 className="text-xl font-semibold text-white">
                      Security Settings
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Two-Factor Authentication
                      </h4>
                      <div className="flex items-center">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                          <input
                            type="checkbox"
                            name="toggle"
                            id="toggle-2fa"
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            checked={user.twoFactorEnabled}
                            readOnly
                          />
                          <label
                            htmlFor="toggle-2fa"
                            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                              user.twoFactorEnabled
                                ? "bg-indigo-500"
                                : "bg-gray-700"
                            }`}
                          ></label>
                        </div>
                        <label htmlFor="toggle-2fa" className="text-gray-300">
                          {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </label>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Two-factor authentication adds an extra layer of
                        security to your account by requiring more than just a
                        password to sign in.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Change Password
                      </h4>
                      <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                        Update Password
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Account Actions
                      </h4>
                      <button className="px-4 py-2 border border-red-800 rounded-md shadow-sm bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors text-sm">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Connections tab content */}
              {activeTab === TABS.CONNECTIONS && (
                <div>
                  <div className="border-b border-gray-800 p-6">
                    <h3 className="text-xl font-semibold text-white">
                      Connected Accounts
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center p-4 border border-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-medium">Facebook</h4>
                          <p className="text-gray-400 text-sm">Not Connected</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                        Connect
                      </button>
                    </div>

                    <div className="flex justify-between items-center p-4 border border-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#1DA1F2] rounded-full">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-medium">Twitter</h4>
                          <p className="text-gray-400 text-sm">Not Connected</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                        Connect
                      </button>
                    </div>

                    <div className="flex justify-between items-center p-4 border border-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#24292E] rounded-full">
                          <svg
                            className="h-6 w-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-medium">GitHub</h4>
                          <p className="text-gray-400 text-sm">Connected</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors text-sm">
                        Disconnect
                      </button>
                    </div>

                    <div className="flex justify-between items-center p-4 border border-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#01babc] rounded-full">
                          <svg
                            className="h-6 w-6 text-white"
                            viewBox="0 0 333 333"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g>
                              <path
                                fill="#01babc"
                                d="M333.333 0H0v333.333h333.333V0z"
                              />
                              <path
                                fill="#fff"
                                d="M183.467 130.198H150.2V96.93h33.267v33.268zm-66.534 0H83.666V96.93h33.267v33.268zm66.534 66.532H150.2v-33.266h33.267v33.266zm-66.534 0H83.666v-33.266h33.267v33.266zm66.534 66.536H150.2V230h33.267v33.266zm-66.534 0H83.666V230h33.267v33.266z"
                              />
                            </g>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-medium">42</h4>
                          <p className="text-gray-400 text-sm">Connected</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors text-sm">
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements section - shown on all tabs */}
              <div className="p-6 pt-0">
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Achievements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {user.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-lg border ${
                          achievement.unlocked
                            ? "bg-indigo-900/20 border-indigo-700"
                            : "bg-gray-800/50 border-gray-700"
                        }`}
                      >
                        <div className="flex">
                          <div className="text-2xl mr-3">
                            {achievement.icon}
                          </div>
                          <div>
                            <h4
                              className={`font-medium ${
                                achievement.unlocked
                                  ? "text-indigo-300"
                                  : "text-gray-400"
                              }`}
                            >
                              {achievement.name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for toggle switch */}
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #4f46e5;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #4f46e5;
        }
        .toggle-checkbox {
          right: 0;
          z-index: 10;
          border-color: #374151;
          transition: all 0.2s;
        }
        .toggle-label {
          width: 2.5rem;
          transition: all 0.2s;
        }
      `}</style>
    </div>
  );
};

export default Profile;
0;
