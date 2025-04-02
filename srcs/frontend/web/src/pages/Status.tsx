import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

// List of available microservices
// Add or modify here to update throughout the application
const AVAILABLE_MICROSERVICES = ["auth", "stats", "game"];

// Service type definition
interface Service {
  status: string;
  statusCode?: number;
  responseTime: string;
}

// Interface for services object
interface ServicesType {
  [key: string]: Service;
}

// Create a simple module-level variable to store the last fetched data
let cachedData: {
  status: ServerStatus | null;
  lastUpdated: Date | null;
} = {
  status: null,
  lastUpdated: null,
};

interface ServerStatus {
  gateway: {
    status: string;
    uptime: number;
    timestamp: string;
    responseTime?: string;
  };
  services: ServicesType;
}

const ServerStatusPage: React.FC = () => {
  const { t } = useLanguage();
  
  // Initialize state with cached data if available, or loading status if first visit
  const [status, setStatus] = useState<ServerStatus | null>(cachedData.status);
  const [loading, setLoading] = useState<boolean>(!cachedData.status);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedData.lastUpdated
  );

  // Use a ref to track if component is mounted
  const isMounted = useRef<boolean>(true);

  // Set mounted flag when component mounts and clear it when unmounts
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchServerStatus = async (isRefreshing = false) => {
    // Skip if component is unmounted
    if (!isMounted.current) return;

    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log("Fetching server status...");

      // Start timer for gateway request
      const startTime = performance.now();
      
      const response = await fetch("/api/health", {
        signal: AbortSignal.timeout(4000),
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Calculate response time
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      const formattedResponseTime = `${responseTimeMs} ms`;

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Health data received:", data);

      // Add response time to gateway data
      if (data.gateway) {
        data.gateway.responseTime = formattedResponseTime;
      }

      // Always update the status regardless of refreshing state
      setStatus(data);
      // Cache the data for future use
      cachedData.status = data;
      setError(null);
      
      // Update last updated timestamp
      const now = new Date();
      setLastUpdated(now);
      cachedData.lastUpdated = now;
    } catch (error) {
      console.error("Error fetching health data:", error);
      
      // Check if it's a rate limit error (429) or other temporary error
      const isRateLimitError = error instanceof Error && 
        (error.message.includes("429") || 
         error.message.includes("Too Many Requests") ||
         error.message.includes("rate limit"));
      
      if (isRateLimitError) {
        // If it's a rate limit error, don't change the state
        console.log("Rate limit error detected");
        // Just show a temporary error message
        setError("Rate limit exceeded. Please try again later.");
      } else {
        // Gateway is down, all services should appear as down
        // Create down services object
        const downServices: ServicesType = {};
        AVAILABLE_MICROSERVICES.forEach(serviceName => {
          downServices[serviceName] = { 
            status: "Down", 
            responseTime: "N/A"
          };
        });
        
        const downStatus = {
          gateway: {
            status: "Down",
            uptime: 0,
            timestamp: new Date().toISOString(),
            responseTime: "N/A",
          },
          services: downServices
        };
        // During a manual update or initial load, update the state
        if (isRefreshing || !status) {
          setStatus(downStatus);
          cachedData.status = downStatus;
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setError(`Gateway unavailable: ${errorMessage}`);
      }
      
      // Update last updated timestamp
      const now = new Date();
      setLastUpdated(now);
      cachedData.lastUpdated = now;
    } finally {
      // Skip setting state if unmounted
      if (!isMounted.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data manually
  const handleManualRefresh = () => {
    fetchServerStatus(true);
  };

  // Load data once when component mounts
  useEffect(() => {
    fetchServerStatus();
  }, []);

  // Format uptime to a readable format
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "up":
      case "healthy":
        return "text-green-500";
      case "warning":
      case "degraded":
        return "text-yellow-500";
      case "down":
      case "critical":
      case "error":
        return "text-red-500";
      case "loading":
        return "text-indigo-400";
      default:
        return "text-gray-500";
    }
  };

  // Function to determine if a service is down based on its status
  const isServiceDown = (status: string): boolean => {
    return ["down", "critical", "error"].includes(status?.toLowerCase());
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "up":
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "down":
      case "critical":
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "loading":
        return <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Translate status text
  const translateStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "up":
        return t('status.state.up');
      case "down":
        return t('status.state.down');
      case "loading":
        return t('status.state.loading');
      case "warning":
        return t('status.state.warning');
      case "degraded":
        return t('status.state.degraded');
      case "critical":
        return t('status.state.critical');
      case "error":
        return t('status.state.error');
      case "healthy":
        return t('status.state.healthy');
      default:
        return status;
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const textColor = getStatusColor(status);
    const icon = getStatusIcon(status);
    const translatedStatus = translateStatus(status);

    // Custom background based on status for better contrast (using theme similar to Login.tsx)
    const bgColorClass = (() => {
      switch (status?.toLowerCase()) {
        case "up":
        case "healthy":
          return "bg-green-900/30 border-green-500/20";
        case "warning":
        case "degraded":
          return "bg-yellow-900/30 border-yellow-500/20";
        case "down":
        case "critical":
        case "error":
          return "bg-red-900/30 border-red-500/20";
        case "loading":
          return "bg-indigo-900/30 border-indigo-500/20";
        default:
          return "bg-gray-900/30 border-gray-500/20";
      }
    })();

    return (
      <span
        className={`inline-flex items-center gap-1 ${bgColorClass} ${textColor} text-xs font-medium px-2.5 py-1 rounded-full border`}
      >
        {icon}
        {translatedStatus}
      </span>
    );
  };

  // Create a display status based on the current loading state and data availability
  const displayStatus = useMemo(() => {
    // If we have cached data (from previous visits), use it during loading
    if (loading && !status && !cachedData.status) {
      // Create loading services based on the list of available services
      const loadingServices: ServicesType = {};
      AVAILABLE_MICROSERVICES.forEach(service => {
        loadingServices[service] = { status: "Loading", responseTime: "..." };
      });
      
      // Only show loading placeholders if we don't have any cached data
      return {
        gateway: {
          status: "Loading",
          uptime: 0,
          timestamp: new Date().toISOString(),
          responseTime: "...",
        },
        services: loadingServices,
      };
    }

    // If we have a state, check and correct any down services without N/A as response
    if (status) {
      const correctedStatus = { ...status };
      
      // If the gateway is down, all services should appear as down
      if (isServiceDown(correctedStatus.gateway.status)) {
        // Create down services object
        const downServices: ServicesType = {};
        
        // Include all services defined in AVAILABLE_MICROSERVICES
        AVAILABLE_MICROSERVICES.forEach(serviceName => {
          downServices[serviceName] = { 
            status: "Down", 
            responseTime: "N/A"
          };
        });
        
        // Replace existing services with down services
        correctedStatus.services = downServices;
      } else {
        // If the gateway is active, only check each individual service
        if (correctedStatus.services) {
          Object.keys(correctedStatus.services).forEach(serviceName => {
            const service = correctedStatus.services[serviceName];
            if (isServiceDown(service.status) && service.responseTime !== "N/A") {
              correctedStatus.services[serviceName] = {
                ...service,
                responseTime: "N/A"
              };
            }
          });
        }
      }
      
      return correctedStatus;
    }

    // If we're just refreshing and have existing data, keep showing the existing data
    return status || cachedData.status;
  }, [loading, status]);

  // Show full-page error only if there's no data at all to display
  if (error && !displayStatus) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            {t('status.connectionError')}
          </h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => fetchServerStatus()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('status.retry')}
            </button>
            <Link to="/" className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('status.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!displayStatus) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-6xl p-8">
        {/* Header with refresh button */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <div className="flex items-center">
              <h1 className="text-3xl font-semibold text-white mb-2">
                {t('status.title')}
              </h1>
              <button
                onClick={handleManualRefresh}
                className="text-indigo-400 hover:text-indigo-300 transition-colors ml-4 p-2 rounded-full hover:bg-indigo-900/50 focus:outline-none"
                disabled={refreshing || loading}
              >
                <RefreshCw
                  className={`h-6 w-6 ${
                    refreshing || loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
            <span className="block mt-2 text-md font-normal text-indigo-400">
              {t('status.subtitle')}
            </span>
          </div>
        </div>

        {/* Gateway Status Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg mb-8">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
                <Server size={24} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {t('status.gateway')}
                </h3>
                <p className="text-gray-400 text-sm">{t('status.gatewayDescription')}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.uptime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.lastUpdated')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    {displayStatus.gateway.status.toLowerCase() === "loading"
                      ? "..."
                      : formatUptime(displayStatus.gateway.uptime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <StatusBadge status={displayStatus.gateway.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    {lastUpdated ? lastUpdated.toLocaleString().replace(",", "") : '...'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Services Status Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg mb-8">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                  <path d="M8 5v4"></path>
                  <rect width="16" height="16" x="4" y="2" rx="2"></rect>
                  <path d="M2 10h4"></path>
                  <path d="M2 14h4"></path>
                  <path d="M18 5v4"></path>
                  <path d="M12 2v20"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{t('status.microservices')}</h2>
                <p className="text-gray-400 text-sm">{t('status.microservicesDescription')}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.service')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-1/3">
                    {t('status.responseTime')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {/* Display existing services */}
                {Object.entries(displayStatus.services)
                  .sort(([nameA], [nameB]) => {
                    // Sort based on position in AVAILABLE_MICROSERVICES
                    const indexA = AVAILABLE_MICROSERVICES.indexOf(nameA);
                    const indexB = AVAILABLE_MICROSERVICES.indexOf(nameB);
                    return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
                  })
                  .map(([name, data]) => (
                    <tr key={name} className="bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(data.status)}
                          <span className="ml-2 text-sm font-medium text-white capitalize">
                            {name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={data.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {data.responseTime}
                      </td>
                    </tr>
                  )
                )}

                {/* If gateway is active, check if there are defined services that don't exist in the response */}
                {displayStatus && displayStatus.gateway && displayStatus.gateway.status.toLowerCase() !== "down" &&
                  displayStatus.gateway.status.toLowerCase() !== "loading" &&
                  displayStatus.services && Object.keys(displayStatus.services).length > 0 &&
                  AVAILABLE_MICROSERVICES.map(serviceName => {
                    if (!displayStatus.services[serviceName]) {
                      return (
                        <tr key={serviceName} className="bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon("down")}
                              <span className="ml-2 text-sm font-medium text-white capitalize">
                                {serviceName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <StatusBadge status="Down" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                            N/A
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  }).filter(Boolean)}

                {/* Show message if there are no services and gateway is active (unusual case) */}
                {displayStatus.gateway.status.toLowerCase() !== "down" &&
                  displayStatus.gateway.status.toLowerCase() !== "loading" &&
                  Object.keys(displayStatus.services).length === 0 && (
                    <tr className="bg-gray-800">
                      <td
                        colSpan={3}
                        className="px-6 py-8 text-center text-sm text-gray-400"
                      >
                        {t('status.noServicesAvailable')}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatusPage;