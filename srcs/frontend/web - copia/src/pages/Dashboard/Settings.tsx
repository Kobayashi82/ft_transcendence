import React, { useState } from "react";
import { Moon, Sun, Bell, Volume2, VolumeX, Globe, Save } from "lucide-react";

// Mock settings data
const mockSettings = {
  theme: "dark",
  language: "en",
  notifications: {
    email: true,
    browser: true,
    app: true,
  },
  sounds: {
    enabled: true,
    volume: 80,
    gameSounds: true,
    chatSounds: true,
    notificationSounds: true,
  },
  gameSettings: {
    showFps: true,
    highQuality: true,
    fullscreen: false,
  },
};

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState(mockSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleThemeToggle = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  };

  const handleNotificationToggle = (type: "email" | "browser" | "app") => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type],
      },
    }));
  };

  const handleSoundToggle = () => {
    setSettings((prev) => ({
      ...prev,
      sounds: {
        ...prev.sounds,
        enabled: !prev.sounds.enabled,
      },
    }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSettings((prev) => ({
      ...prev,
      sounds: {
        ...prev.sounds,
        volume: value,
      },
    }));
  };

  const handleGameSettingToggle = (
    setting: "showFps" | "highQuality" | "fullscreen"
  ) => {
    setSettings((prev) => ({
      ...prev,
      gameSettings: {
        ...prev.gameSettings,
        [setting]: !prev.gameSettings[setting],
      },
    }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings((prev) => ({
      ...prev,
      language: e.target.value,
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      // Reset saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div>
      <div className="border-b border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">General Settings</h3>
      </div>
      <div className="p-6 space-y-8">
        {/* Theme Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">Appearance</h4>
          <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
            <div className="flex items-center">
              {settings.theme === "dark" ? (
                <Moon size={20} className="text-indigo-400 mr-3" />
              ) : (
                <Sun size={20} className="text-yellow-400 mr-3" />
              )}
              <div>
                <p className="text-white font-medium">Theme</p>
                <p className="text-gray-400 text-sm">
                  {settings.theme === "dark" ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
            </div>
            <div className="relative inline-block w-12 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggle-theme"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                checked={settings.theme === "dark"}
                onChange={handleThemeToggle}
              />
              <label
                htmlFor="toggle-theme"
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                  settings.theme === "dark" ? "bg-indigo-500" : "bg-gray-700"
                }`}
              ></label>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">Language</h4>
          <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
            <div className="flex items-center">
              <Globe size={20} className="text-indigo-400 mr-3" />
              <div>
                <p className="text-white font-medium">Interface Language</p>
                <p className="text-gray-400 text-sm">
                  Select your preferred language
                </p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={handleLanguageChange}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {/* Notification Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">
            Notifications
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <div className="flex items-center">
                <Bell size={20} className="text-indigo-400 mr-3" />
                <p className="text-white">Email Notifications</p>
              </div>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-email"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.notifications.email}
                  onChange={() => handleNotificationToggle("email")}
                />
                <label
                  htmlFor="toggle-email"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.notifications.email
                      ? "bg-indigo-500"
                      : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <div className="flex items-center">
                <Bell size={20} className="text-indigo-400 mr-3" />
                <p className="text-white">Browser Notifications</p>
              </div>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-browser"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.notifications.browser}
                  onChange={() => handleNotificationToggle("browser")}
                />
                <label
                  htmlFor="toggle-browser"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.notifications.browser
                      ? "bg-indigo-500"
                      : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <div className="flex items-center">
                <Bell size={20} className="text-indigo-400 mr-3" />
                <p className="text-white">In-App Notifications</p>
              </div>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-app"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.notifications.app}
                  onChange={() => handleNotificationToggle("app")}
                />
                <label
                  htmlFor="toggle-app"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.notifications.app ? "bg-indigo-500" : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>
          </div>
        </div>

        {/* Sounds Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">
            Sound Settings
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <div className="flex items-center">
                {settings.sounds.enabled ? (
                  <Volume2 size={20} className="text-indigo-400 mr-3" />
                ) : (
                  <VolumeX size={20} className="text-gray-400 mr-3" />
                )}
                <p className="text-white">Sound Effects</p>
              </div>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-sound"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.sounds.enabled}
                  onChange={handleSoundToggle}
                />
                <label
                  htmlFor="toggle-sound"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.sounds.enabled ? "bg-indigo-500" : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>

            {settings.sounds.enabled && (
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white">Volume</p>
                  <p className="text-gray-400 text-sm">
                    {settings.sounds.volume}%
                  </p>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sounds.volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Game Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">
            Game Settings
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <p className="text-white">Show FPS</p>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-fps"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.gameSettings.showFps}
                  onChange={() => handleGameSettingToggle("showFps")}
                />
                <label
                  htmlFor="toggle-fps"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.gameSettings.showFps
                      ? "bg-indigo-500"
                      : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <p className="text-white">High Quality Graphics</p>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-quality"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.gameSettings.highQuality}
                  onChange={() => handleGameSettingToggle("highQuality")}
                />
                <label
                  htmlFor="toggle-quality"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.gameSettings.highQuality
                      ? "bg-indigo-500"
                      : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
              <p className="text-white">Fullscreen Mode</p>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle-fullscreen"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={settings.gameSettings.fullscreen}
                  onChange={() => handleGameSettingToggle("fullscreen")}
                />
                <label
                  htmlFor="toggle-fullscreen"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.gameSettings.fullscreen
                      ? "bg-indigo-500"
                      : "bg-gray-700"
                  }`}
                ></label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-800">
          {saved && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-md text-green-300 text-sm">
              Settings saved successfully!
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
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
              <>
                <Save size={18} className="mr-2" />
                Save Settings
              </>
            )}
          </button>
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
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
