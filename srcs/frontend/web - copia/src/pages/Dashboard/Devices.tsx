import React from "react";
import {
  Smartphone,
  Monitor,
  Laptop,
  Trash2,
  MapPin,
  Clock,
} from "lucide-react";

// Mock active sessions data
const mockActiveSessions = [
  {
    id: 1,
    deviceType: "desktop",
    browser: "Chrome",
    operatingSystem: "Windows 10",
    ipAddress: "192.168.1.1",
    location: "Paris, France",
    lastActive: "2023-09-15T14:30:00",
    isCurrent: true,
  },
  {
    id: 2,
    deviceType: "mobile",
    browser: "Safari",
    operatingSystem: "iOS 16",
    ipAddress: "192.168.1.2",
    location: "Lyon, France",
    lastActive: "2023-09-14T10:15:00",
    isCurrent: false,
  },
  {
    id: 3,
    deviceType: "laptop",
    browser: "Firefox",
    operatingSystem: "macOS",
    ipAddress: "192.168.1.3",
    location: "Marseille, France",
    lastActive: "2023-09-13T18:45:00",
    isCurrent: false,
  },
];

const DevicesPanel: React.FC = () => {
  // Get device icon based on device type
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="text-indigo-400" size={24} />;
      case "desktop":
        return <Monitor className="text-indigo-400" size={24} />;
      case "laptop":
        return <Laptop className="text-indigo-400" size={24} />;
      default:
        return <Monitor className="text-indigo-400" size={24} />;
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div>
      <div className="border-b border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">Active Sessions</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-400 text-sm mb-6">
          These are the devices that are currently signed into your account. If
          you don't recognize a device, you should sign out from it and change
          your password immediately.
        </p>

        <div className="space-y-4">
          {mockActiveSessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border rounded-lg ${
                session.isCurrent
                  ? "border-indigo-600 bg-indigo-900/20"
                  : "border-gray-700 bg-gray-800/30"
              }`}
            >
              <div className="flex items-start">
                <div className="p-2 bg-gray-800 rounded-md mr-4">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-white font-medium">
                        {session.browser} on {session.operatingSystem}
                        {session.isCurrent && (
                          <span className="ml-2 text-xs bg-indigo-700 text-indigo-100 py-0.5 px-2 rounded-full">
                            Current
                          </span>
                        )}
                      </h4>
                      <div className="text-gray-400 text-sm mt-1 flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {session.location} • IP: {session.ipAddress}
                      </div>
                      <div className="text-gray-400 text-sm mt-1 flex items-center">
                        <Clock size={14} className="mr-1" />
                        Last active: {formatDate(session.lastActive)}
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-gray-700">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <button className="px-4 py-2 bg-red-900/30 border border-red-700 text-red-400 rounded-md hover:bg-red-900/40 transition-colors">
            Sign Out Of All Devices
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevicesPanel;
