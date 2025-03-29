import React from "react";

interface SecurityPanelProps {
  user: {
    twoFactorEnabled: boolean;
  };
}

const SecurityPanel: React.FC<SecurityPanelProps> = ({ user }) => {
  return (
    <div>
      <div className="border-b border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">Security Settings</h3>
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
                  user.twoFactorEnabled ? "bg-indigo-500" : "bg-gray-700"
                }`}
              ></label>
            </div>
            <label htmlFor="toggle-2fa" className="text-gray-300">
              {user.twoFactorEnabled ? "Enabled" : "Disabled"}
            </label>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Two-factor authentication adds an extra layer of security to your
            account by requiring more than just a password to sign in.
          </p>
          <button className="mt-4 px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
            {user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Change Password
          </h4>
          <p className="text-gray-400 text-sm mb-4">
            It's a good idea to use a strong password that you're not using
            elsewhere.
          </p>
          <button className="px-4 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
            Update Password
          </button>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Account Actions
          </h4>
          <p className="text-red-400 text-sm mb-4">
            Deleting your account is permanent. All your data will be wiped out
            immediately and you won't be able to get it back.
          </p>
          <button className="px-4 py-2 border border-red-800 rounded-md shadow-sm bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors text-sm">
            Delete Account
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
      `}</style>
    </div>
  );
};

export default SecurityPanel;
