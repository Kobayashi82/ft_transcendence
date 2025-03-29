import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";

// Create a simple module-level variable to store the last fetched data
// This will persist between component unmounts/remounts (like navigating away and back)
let cachedData: {
  status: ServerStatus | null;
  kibanaStatus: "Up" | "Down" | "Loading" | null;
  grafanaStatus: "Up" | "Down" | "Loading" | null;
  lastUpdated: Date | null;
} = {
  status: null,
  kibanaStatus: null,
  grafanaStatus: null,
  lastUpdated: null,
};

interface ServerStatus {
  gateway: {
    status: string;
    uptime: number;
    timestamp: string;
    responseTime: string; // Make this field optional since it might not exist in all responses
  };
  services: {
    [key: string]: {
      status: string;
      responseTime: string;
    };
  };
}

// Default statuses for when the server is down
const DEFAULT_DOWN_STATUS: ServerStatus = {
  gateway: {
    status: "Down",
    uptime: 0,
    timestamp: new Date().toISOString(),
    responseTime: "N/A",
  },
  services: {},
};

const ServerStatusPage: React.FC = () => {
  // Initialize state with cached data if available, or loading status if first visit
  const [status, setStatus] = useState<ServerStatus | null>(cachedData.status);
  const [kibanaStatus, setKibanaStatus] = useState<"Up" | "Down" | "Loading">(
    cachedData.kibanaStatus || "Loading"
  );
  const [grafanaStatus, setGrafanaStatus] = useState<"Up" | "Down" | "Loading">(
    cachedData.grafanaStatus || "Loading"
  );
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
        // When manually refreshing, set the monitoring tools status to Loading
        // so they properly update even if they are the only services that changed
        //setKibanaStatus('Loading');
        //setGrafanaStatus('Loading');
      } else {
        setLoading(true);
      }

      // Create separate fetch promises for each service
      const gatewayFetch = () => {
        // Start timer for gateway request
        const startTime = performance.now();

        return fetch("/api/internal/health", {
          signal: AbortSignal.timeout(4000),
          // Add cache control to prevent browser caching when refreshing
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
          .then(async (response) => {
            // Calculate response time - measure only network time, not JSON parsing
            const endTime = performance.now();
            const responseTimeMs = Math.round(endTime - startTime); // Round to whole number
            const formattedResponseTime = `${responseTimeMs} ms`;

            if (response.ok) {
              try {
                const data = await response.json();
                // Add response time to gateway data
                if (data.gateway) {
                  data.gateway.responseTime = formattedResponseTime;
                }
                return {
                  success: true,
                  data,
                  responseTime: formattedResponseTime,
                  responseTimeMs,
                };
              } catch (jsonError) {
                console.error(
                  "Error parsing gateway response JSON:",
                  jsonError
                );
                return {
                  success: false,
                  error: "Invalid JSON response",
                  responseTime: formattedResponseTime,
                  responseTimeMs,
                };
              }
            }
            return {
              success: false,
              status: response.status,
              statusText: response.statusText,
              responseTime: formattedResponseTime,
              responseTimeMs,
            };
          })
          .catch((error) => {
            // Calculate response time even for errors
            const endTime = performance.now();
            const responseTimeMs = Math.round(endTime - startTime); // Round to whole number
            const formattedResponseTime = `${responseTimeMs}ms`;

            console.error("Gateway health check failed:", error);
            return {
              success: false,
              error: error.message,
              responseTime: formattedResponseTime,
              responseTimeMs,
            };
          });
      };

      const kibanaFetch = () =>
        fetch("/kibana", {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
          // Add cache control to prevent browser caching
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
          .then((response) => {
            console.log(
              "Kibana response status:",
              response.status,
              response.ok
            );
            return { success: response.ok };
          })
          .catch((error) => {
            console.error("Kibana health check failed:", error);
            return { success: false };
          });

      const grafanaFetch = () =>
        fetch("/grafana", {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
          // Add cache control to prevent browser caching
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
          .then((response) => {
            console.log(
              "Grafana response status:",
              response.status,
              response.ok
            );
            return { success: response.ok };
          })
          .catch((error) => {
            console.error("Grafana health check failed:", error);
            return { success: false };
          });

      // Run all fetches completely independently
      const results = await Promise.allSettled([
        gatewayFetch(),
        kibanaFetch(),
        grafanaFetch(),
      ]);

      // Skip if component unmounted during fetch
      if (!isMounted.current) return;

      // Process gateway result - first promise
      const gatewayResult =
        results[0].status === "fulfilled"
          ? results[0].value
          : { success: false, responseTime: "N/A", responseTimeMs: 0 };

      if (gatewayResult.success && "data" in gatewayResult) {
        // Ensure the gateway response time is properly set
        if (
          gatewayResult.data &&
          gatewayResult.data.gateway &&
          !gatewayResult.data.gateway.responseTime
        ) {
          gatewayResult.data.gateway.responseTime =
            gatewayResult.responseTime || "N/A";
        }

        // Add gateway response time to each service response time for end-to-end timing
        if (
          gatewayResult.data &&
          gatewayResult.data.services &&
          gatewayResult.responseTimeMs
        ) {
          const gatewayTimeMs = gatewayResult.responseTimeMs;

          Object.keys(gatewayResult.data.services).forEach((serviceName) => {
            const service = gatewayResult.data.services[serviceName];
            if (service && service.responseTime) {
              // Extract the numeric part of the service response time (remove the 'ms' suffix)
              const serviceTimeMatch =
                service.responseTime.match(/^(\d+(?:\.\d+)?)/);

              if (serviceTimeMatch) {
                const serviceTimeMs = parseFloat(serviceTimeMatch[1]);
                // Update the response time to show both the service time and the total time
                service.responseTime = `${serviceTimeMs} ms`;
              }
            } else {
              service.responseTime = `N/A`;
            }
          });
        }

        // Always update the status regardless of refreshing state
        setStatus(gatewayResult.data);
        // Cache the data for future use
        cachedData.status = gatewayResult.data;
        setError(null);
      } else {
        // Create a custom DOWN status with the measured response time
        const downStatus = {
          ...DEFAULT_DOWN_STATUS,
          gateway: {
            ...DEFAULT_DOWN_STATUS.gateway,
            responseTime: "N/A",
          },
        };

        // During manual refresh, always update the status
        if (isRefreshing) {
          setStatus(downStatus);
          cachedData.status = downStatus;
        }
        // Only update with down status if we don't have any status yet during initial load
        else if (!status) {
          setStatus(downStatus);
          cachedData.status = downStatus;
        }

        setError(
          `Gateway unavailable: ${
            (gatewayResult as any).statusText ||
            (gatewayResult as any).error ||
            "Unknown error"
          }`
        );
      }

      // Process kibana result - second promise
      const kibanaResult =
        results[1].status === "fulfilled"
          ? results[1].value
          : { success: false };
      console.log("Kibana result:", kibanaResult);
      const newKibanaStatus = kibanaResult.success ? "Up" : "Down";
      setKibanaStatus(newKibanaStatus);
      cachedData.kibanaStatus = newKibanaStatus;

      // Process grafana result - third promise
      const grafanaResult =
        results[2].status === "fulfilled"
          ? results[2].value
          : { success: false };
      console.log("Grafana result:", grafanaResult);
      const newGrafanaStatus = grafanaResult.success ? "Up" : "Down";
      setGrafanaStatus(newGrafanaStatus);
      cachedData.grafanaStatus = newGrafanaStatus;

      // Update last updated timestamp
      const now = new Date();
      setLastUpdated(now);
      cachedData.lastUpdated = now;
    } catch (err) {
      // Skip setting state if unmounted
      if (!isMounted.current) return;

      console.error("Error in fetchServerStatus:", err);

      // Only set down status if we don't have any data yet or during manual refresh
      if (!status || isRefreshing) {
        setStatus(DEFAULT_DOWN_STATUS);
        cachedData.status = DEFAULT_DOWN_STATUS;
      }

      setError(
        err instanceof Error ? err.message : "Failed to fetch server status"
      );

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
    // Always pass true to force a true refresh and update all services
    fetchServerStatus(true);
  };

  // Load data only once when component mounts
  useEffect(() => {
    // Always trigger a refresh when mounting the component
    // If we have cached data, it will be displayed immediately while new data loads
    fetchServerStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Get status background color
  const getStatusBgColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "up":
      case "healthy":
        return "bg-green-100";
      case "warning":
      case "degraded":
        return "bg-yellow-100";
      case "down":
      case "critical":
      case "error":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
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

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const textColor = getStatusColor(status);
    const icon = getStatusIcon(status);

    // Custom background based on status for better contrast
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
        {status}
      </span>
    );
  };

  // Create a display status based on the current loading state and data availability
  const displayStatus = useMemo(() => {
    // If we have cached data (from previous visits), use it during loading
    if (loading && !status && !cachedData.status) {
      // Only show loading placeholders if we don't have any cached data
      return {
        gateway: {
          status: "Loading",
          uptime: 0,
          timestamp: new Date().toISOString(),
          responseTime: "...",
        },
        services: {
          auth: { status: "Loading", responseTime: "..." },
          user: { status: "Loading", responseTime: "..." },
        },
      };
    }

    // If we're just refreshing and have existing data, keep showing the existing data
    return status || cachedData.status;
  }, [loading, status]);

  // Show full-page error only if there's no data at all to display
  if (error && !displayStatus) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Connection Error
          </h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => fetchServerStatus()}
              className="btn-primary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
            <Link to="/" className="btn-secondary flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!displayStatus) return null;

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-16 flex items-center overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-40 h-40 bg-indigo-500 rounded-full opacity-10 blur-3xl -top-10 -left-10"></div>
          <div className="absolute w-60 h-60 bg-blue-500 rounded-full opacity-10 blur-3xl top-1/4 right-1/4"></div>
        </div>

        <div className="container-custom relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <div className="flex items-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white sm:text-4xl mb-2">
                  Server Status
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
              <span className="block mt-2 text-lg font-normal text-indigo-300">
                Real-time monitoring
              </span>
            </div>

            {lastUpdated && (
              <div className="text-right mt-4 md:mt-0 text-gray-400 text-sm">
                Last updated:
                <br />
                {lastUpdated.toLocaleString().replace(",", "")}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-950">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Gateway Status Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/10">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
                    <Server size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Gateway
                    </h3>
                    <p className="text-gray-400 text-sm">API Gateway Service</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <StatusBadge status={displayStatus.gateway.status} />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Uptime:</span>
                    <span className="text-white font-mono">
                      {displayStatus.gateway.status.toLowerCase() === "loading"
                        ? "..."
                        : formatUptime(displayStatus.gateway.uptime)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    {/* <span className="text-gray-400">Response Time:</span> */}
                    <span className="text-white font-mono">
                      {/* {displayStatus.gateway.responseTime || '...'} */}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kibana Status Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/10">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
                    <Activity size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Kibana</h3>
                    <p className="text-gray-400 text-sm">
                      Logging Visualization
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <StatusBadge status={kibanaStatus} />
                  </div>

                  {kibanaStatus === "Loading" ? (
                    <p className="text-indigo-400 text-sm text-center">
                      Checking availability...
                    </p>
                  ) : kibanaStatus === "Up" ? (
                    <a
                      href="/kibana"
                      className="btn-primary w-full mt-4 text-center block"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Kibana Dashboard
                    </a>
                  ) : (
                    <p className="text-yellow-400 text-sm mt-4">
                      Kibana is currently unavailable
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Grafana Status Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/10">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
                    <Database size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Grafana
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Metrics Visualization
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <StatusBadge status={grafanaStatus} />
                  </div>

                  {grafanaStatus === "Loading" ? (
                    <p className="text-indigo-400 text-sm text-center">
                      Checking availability...
                    </p>
                  ) : grafanaStatus === "Up" ? (
                    <a
                      href="/grafana"
                      className="btn-primary w-full mt-4 text-center block"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Grafana Dashboard
                    </a>
                  ) : (
                    <p className="text-yellow-400 text-sm mt-4">
                      Grafana is currently unavailable
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Services Status Section */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg mb-12">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-2xl font-bold text-white">Microservices</h2>
              <p className="text-gray-400 mt-1">
                Status of all backend services
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Documentation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {/* Core API Services */}
                  {Object.entries(displayStatus.services).map(
                    ([name, data]) => (
                      <tr key={name} className="bg-gray-900 hover:bg-gray-800">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {data.status.toLowerCase() === "up" ||
                          data.status.toLowerCase() === "healthy" ||
                          data.status.toLowerCase() === "degraded" ? (
                            <Link
                              to={`/api-docs/${name.toLowerCase()}`}
                              className="text-indigo-400 hover:text-indigo-300 hover:underline"
                            >
                              View API Docs
                            </Link>
                          ) : data.status.toLowerCase() === "loading" ? (
                            <span className="text-indigo-400">Loading...</span>
                          ) : (
                            <span className="text-gray-500">Not available</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {/* If gateway is down and no services are returned, show default service list as down */}
                  {displayStatus.gateway.status.toLowerCase() === "down" &&
                    Object.keys(displayStatus.services).length === 0 &&
                    ["Auth", "User"].map((serviceName) => (
                      <tr
                        key={serviceName}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Not available
                        </td>
                      </tr>
                    ))}

                  {/* Show message if no services and gateway is up (unusual case) */}
                  {displayStatus.gateway.status.toLowerCase() !== "down" &&
                    displayStatus.gateway.status.toLowerCase() !== "loading" &&
                    Object.keys(displayStatus.services).length === 0 && (
                      <tr className="bg-gray-900">
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-sm text-gray-400"
                        >
                          No services information available
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServerStatusPage;
