import React from "react";

const ConnectionsPanel: React.FC = () => {
  return (
    <div>
      <div className="border-b border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">Connected Accounts</h3>
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
                  <path fill="#01babc" d="M333.333 0H0v333.333h333.333V0z" />
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
  );
};

export default ConnectionsPanel;
