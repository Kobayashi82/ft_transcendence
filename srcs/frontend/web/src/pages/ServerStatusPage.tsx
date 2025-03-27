import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServerStatus {
  gateway: {
    status: string;
    uptime: number;
    timestamp: string;
  };
  services: {
    [key: string]: {
      status: string;
      responseTime: string;
    };
  };
}

const ServerStatusPage: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [kibanaStatus, setKibanaStatus] = useState<'Up' | 'Down'>('Down');
  const [grafanaStatus, setGrafanaStatus] = useState<'Up' | 'Down'>('Down');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const checkAdditionalServices = async () => {
    try {
      // Check Kibana (timeout 3 seconds)
      const kibanaResponse = await fetch('/kibana', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
      
      setKibanaStatus(kibanaResponse && kibanaResponse.ok ? 'Up' : 'Down');
      
      // Check Grafana (timeout 3 seconds)
      const grafanaResponse = await fetch('/grafana', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
      
      setGrafanaStatus(grafanaResponse && grafanaResponse.ok ? 'Up' : 'Down');

    } catch (error) {
      console.error('Error checking monitoring services:', error);
    }
  };

  const fetchServerStatus = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch('/api/internal/health');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
      setLastUpdated(new Date());
      
      // Check Kibana and Grafana
      await checkAdditionalServices();
    } catch (err) {
      console.error('Error fetching server status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchServerStatus(true), 30000);
    
    return () => clearInterval(interval);
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
      case 'up':
      case 'healthy':
        return 'text-green-500';
      case 'warning':
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
      case 'critical':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get status background color
  const getStatusBgColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'up':
      case 'healthy':
        return 'bg-green-100';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100';
      case 'down':
      case 'critical':
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
      case 'critical':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const bgColor = getStatusBgColor(status);
    const textColor = getStatusColor(status);
    const icon = getStatusIcon(status);
    
    return (
      <span className={`inline-flex items-center gap-1 ${bgColor} ${textColor} text-xs font-medium px-2.5 py-1 rounded-full`}>
        {icon}
        {status}
      </span>
    );
  };

  if (loading && !status) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-700">Checking server status...</h2>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => fetchServerStatus()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
            <Link 
              to="/login"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Server Status
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Real-time monitoring of system services
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              <ArrowLeft className="mr-2 -ml-1 h-4 w-4" />
              Back to Login
            </Link>
            
            <button 
              onClick={() => fetchServerStatus(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 -ml-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="flex justify-end mb-2">
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Server Status (Gateway) */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Gateway
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Uptime
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-10 w-1/3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Last Started
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatUptime(status.gateway.uptime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={status.gateway.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Date.now() - (status.gateway.uptime * 1000)).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Services
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-10 w-1/3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Core API Services */}
                {Object.entries(status.services).map(([name, data]) => (
                  <tr key={name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(data.status)}
                      {data.status.toLowerCase() === 'healthy' || data.status.toLowerCase() === 'degraded' ? (
                      <Link 
                        to={`/api-docs/${name.toLowerCase()}`}
                        className="ml-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <span className="capitalize">{name}</span>
                      </Link>
                      ) : (
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">{name}</span>
                      )}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={data.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.responseTime}
                    </td>
                  </tr>
                ))}
                
                {/* Show message if no services */}
                {Object.keys(status.services).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No services information available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monitoring Tools */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Monitoring Tools
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Tool
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-10 w-1/3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    {/* Empty column to maintain spacing */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(kibanaStatus)}
                      <div className="ml-2">
                        {kibanaStatus === 'Up' ? (
                          <a 
                            href="/kibana" 
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Kibana (Logging)
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">Kibana (Logging)</span>
                        )}
                        <p className="text-xs text-gray-500">Elasticsearch visualization tool</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={kibanaStatus} />
                  </td>
                  <td></td> {/* Empty cell to maintain the structure */}
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(grafanaStatus)}
                      <div className="ml-2">
                        {grafanaStatus === 'Up' ? (
                          <a 
                            href="/grafana" 
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Grafana (Metrics)
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">Grafana (Metrics)</span>
                        )}
                        <p className="text-xs text-gray-500">Metrics visualization dashboard</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={grafanaStatus} />
                  </td>
                  <td></td> {/* Empty cell to maintain the structure */}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServerStatusPage;
