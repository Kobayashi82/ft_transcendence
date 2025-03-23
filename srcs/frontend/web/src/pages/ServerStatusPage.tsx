import React, { useState, useEffect } from 'react';

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
  const [error, setError] = useState<string | null>(null);

  const checkAdditionalServices = async () => {
    try {
      // Check Kibana
      const kibanaResponse = await fetch('/kibana', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // Timeout after 3 seconds
      }).catch(() => null);
      
      setKibanaStatus(kibanaResponse && kibanaResponse.ok ? 'Up' : 'Down');
      
      // Check Grafana
      const grafanaResponse = await fetch('/grafana', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // Timeout after 3 seconds
      }).catch(() => null);
      
      setGrafanaStatus(grafanaResponse && grafanaResponse.ok ? 'Up' : 'Down');
    } catch (error) {
      // Silently fail, statuses will remain as Down
    }
  };

  const fetchServerStatus = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/health');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
      
      // Also check Kibana and Grafana status
      await checkAdditionalServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchServerStatus, 10000);
    
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

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-500';
    let displayStatus = status;
    
    // Only transform Up/Down for Kibana and Grafana
    if (status === 'Up') {
      color = 'bg-green-500';
    } else if (status === 'Down') {
      color = 'bg-red-500';
    } else if (status === 'healthy') {
      color = 'bg-green-500';
    } else if (status === 'warning') {
      color = 'bg-yellow-500';
    } else if (status === 'critical' || status === 'error') {
      color = 'bg-red-500';
    }
    
    return (
      <span className={`${color} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}>
        {displayStatus}
      </span>
    );
  };

  if (loading && !status) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={fetchServerStatus}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Server Status
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Real-time monitoring of system services
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Last updated: {new Date(status.gateway.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Server Status (Gateway) */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
				  	Uptime
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Gateway
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={status.gateway.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatUptime(status.gateway.uptime)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Services
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <StatusBadge status={data.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.responseTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Monitoring Tools */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Monitoring Tools
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Tool
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    {/* Empty header to align with Services table */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kibanaStatus === 'Up' ? (
                      <a 
                        href="/kibana" 
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Kibana
                      </a>
                    ) : (
                      "Kibana"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={kibanaStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Empty cell to align with Services table */}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {grafanaStatus === 'Up' ? (
                      <a 
                        href="/grafana" 
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Grafana
                      </a>
                    ) : (
                      "Grafana"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={grafanaStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Empty cell to align with Services table */}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button 
            onClick={fetchServerStatus}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerStatusPage;