// API service for making requests to the backend with cookie support

const API_BASE_URL = `/api`; // Using relative path to work in any environment

// Device ID management
const DEVICE_ID_KEY = 'device_id';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string; // Now optional, might not come if using cookies
  expires_in: number;
  token_type: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  username: string;
  roles: string[];
  has_2fa: boolean;
  account_type?: string;
  last_login?: string;
  created_at?: string;
  is_active?: boolean;
  devices?: any[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  last_used?: string;
  login_count?: number;
}

// Generate or retrieve device ID
const getDeviceId = (): string => {
  let deviceId = sessionStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : generateFallbackUUID();
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// Fallback UUID generation for browsers that don't support crypto.randomUUID
const generateFallbackUUID = (): string => {
  // Simple implementation to generate a UUID-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Detect device type
const detectDeviceType = (): string => {
  const ua = navigator.userAgent;
  
  if (/android/i.test(ua)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(ua)) {
    return 'ios';
  }
  
  if (/Windows/.test(ua)) {
    return 'windows';
  }
  
  if (/Macintosh/.test(ua)) {
    return 'mac';
  }
  
  if (/Linux/.test(ua)) {
    return 'linux';
  }
  
  return 'browser';
};

// Get device name
const getDeviceName = (): string => {
  return navigator.userAgent;
};

// Get device info
export const getDeviceInfo = (): DeviceInfo => {
  return {
    id: getDeviceId(),
    name: getDeviceName(),
    type: detectDeviceType()
  };
};

// API Error handler
class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Check if session is active via session cookie
export const isSessionActive = (): boolean => {
  const sessionCookie = getCookie('session_active');
  return sessionCookie === 'true';
};

// Añadir un helper para obtener cookies
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};

// Current access token in memory
let currentAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Get the current access token from memory
export const getAccessToken = (): string | null => {
  if (!currentAccessToken || !tokenExpiryTime) {
    return null;
  }
  
  // If token is expired, return null (will trigger refresh)
  if (Date.now() > tokenExpiryTime) {
    console.log('Token expired, needs refresh');
    return null;
  }
  
  return currentAccessToken;
};

// Set the current access token in memory
export const setAccessToken = (token: string, expiresIn: number): void => {
  // Mantener en memoria para uso inmediato
  currentAccessToken = token;
  tokenExpiryTime = Date.now() + expiresIn * 1000;
  
  // No necesitamos almacenamiento local para tokens
  console.log(`Access token set, expires in ${expiresIn} seconds`);
}

// Clear the current access token
export const clearAccessToken = (): void => {
  currentAccessToken = null;
  tokenExpiryTime = null;
}

// Refreshing flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
  config: RequestInit & { url: string }
}> = [];

// Process queued requests after token refresh
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      // Retry original request with new token
      const newConfig = { ...promise.config };
      if (newConfig.headers) {
        newConfig.headers = { 
          ...newConfig.headers as Record<string, string>, 
          'Authorization': `Bearer ${token}` 
        };
      }
      fetch(promise.config.url, newConfig)
        .then(response => response.json())
        .then(data => promise.resolve(data))
        .catch(err => promise.reject(err));
    }
  });
  
  // Clear queue
  failedQueue = [];
};

// Attempt to refresh token
const refreshAccessToken = async (): Promise<string> => {
  try {
    console.log('Attempting to refresh token');
    // Intentar refrescar con cookies (las cookies se envían automáticamente)
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        refresh_token: localStorage.getItem('refresh_token') || '', // Add this
        device_id: getDeviceId() 
      }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Refresh token request failed:', response.status);
      throw new Error('Failed to refresh token');
    }
    
    const data: AuthResponse = await response.json();
    console.log('Token refreshed successfully');
    
    // Almacenar token solo en memoria
    setAccessToken(data.access_token, data.expires_in);
    
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAccessToken(); // Limpiar token para forzar login
    throw error;
  }
};

// Fetch wrapper with error handling and token refresh
async function fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
  // Si no hay opciones, crear un objeto vacío
  options = options || {};
  
  // Si no hay headers, crear un objeto vacío
  options.headers = options.headers || {};
  
  // Obtener token (solo de memoria)
  const token = getAccessToken();
  
  // Añadir token a headers si existe
  if (token) {
    console.log(`Using token: ${token.substring(0, 10)}...`);
    (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  // Siempre incluir credentials para enviar cookies con cada solicitud
  options = {
    ...options,
    credentials: 'include'
  };
  
  try {
  // If we need a token but don't have one, try to refresh
  if (!token && isSessionActive() && url !== `${API_BASE_URL}/auth/refresh`) {
    console.log('No token but session active, trying to refresh');
    // If we're not already refreshing, try to refresh
    if (!isRefreshing) {
      isRefreshing = true;
      
      try {
        const newToken = await refreshAccessToken();
        
        // Update headers with new token
        if (options?.headers) {
          (options.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        }
        
        // Process queued requests
        processQueue(null, newToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        processQueue(error as Error);
        throw error;
      } finally {
        isRefreshing = false;
      }
    } else {
      // If already refreshing, add to queue
      console.log('Already refreshing, adding request to queue');
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          config: { ...options, url } as RequestInit & { url: string }
        });
      }) as Promise<T>;
    }
  }
    
    const response = await fetch(url, options);
    
    // If token is invalid, try to refresh once
    if (response.status === 401 && url !== `${API_BASE_URL}/auth/refresh`) {
      console.log('401 response, trying to refresh token');
      // Similar to above, but we know the token is definitely invalid now
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const newToken = await refreshAccessToken();
          
          // Update headers with new token
          if (options?.headers) {
            (options.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          }
          
          // Retry request with new token
          const retryResponse = await fetch(url, options);
          
          if (!retryResponse.ok) {
            console.error('Retry failed:', retryResponse.status);
            throw new ApiError(
              `Error: ${retryResponse.status} ${retryResponse.statusText}`,
              retryResponse.status
            );
          }
          
          // Process queued requests
          processQueue(null, newToken);
          
          return await retryResponse.json() as T;
        } catch (error) {
          console.error('Token refresh failed:', error);
          processQueue(error as Error);
          throw error;
        } finally {
          isRefreshing = false;
        }
      } else {
        // If already refreshing, add to queue
        console.log('Already refreshing, adding request to queue');
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
            config: { ...options, url } as RequestInit & { url: string }
          });
        }) as Promise<T>;
      }
    }
    
    if (!response.ok) {
      let errorMessage = `Error: ${response.status} ${response.statusText}`;
      let errorData = {};
      
      try {
        errorData = await response.json();
        if (errorData && (errorData as any).message) {
          errorMessage = (errorData as any).message;
        }
      } catch (e) {
        // No JSON response
      }
      
      console.error('API error:', errorMessage);
      throw new ApiError(errorMessage, response.status);
    }
    
    // Check if the response is empty (for 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }
    
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError((error as Error).message || 'Unknown error occurred', 500);
  }
}

// Auth API service
export const authApi = {
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const deviceInfo = getDeviceInfo();
    
    const requestBody = {
      ...credentials,
      device_info: deviceInfo
    };
    
    const response = await fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    // Store token in memory
    if (response.access_token) {
      setAccessToken(response.access_token, response.expires_in);
    }
    
    return response;
  },
  
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    // Add device info to request
    const requestBody = {
      ...data,
      device_info: getDeviceInfo()
    };
    
    const response = await fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Store token in memory
    setAccessToken(response.access_token, response.expires_in);
    
    return response;
  },
  
  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const deviceInfo = getDeviceInfo();
    
    const response = await fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: deviceInfo.id }),
    });
    
    // Store new token in memory
    setAccessToken(response.access_token, response.expires_in);
    
    return response;
  },
  
  // Get current user info
  async getCurrentUser(): Promise<User> {
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  // Logout
  async logout(): Promise<void> {
    await fetchWithErrorHandling(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Clear token from memory
    clearAccessToken();
  },
  
  // Initialize OAuth login processes
  async getGoogleOAuthURL(): Promise<string> {
    // Encode device info as base64
    const deviceInfo = getDeviceInfo();
    const encodedDeviceInfo = btoa(JSON.stringify(deviceInfo));
    
    const response = await fetchWithErrorHandling<{ url: string }>(
      `${API_BASE_URL}/auth/oauth/google/init?device_info=${encodedDeviceInfo}`
    );
    return response.url;
  },
  
  async get42OAuthURL(): Promise<string> {
    // Encode device info as base64
    const deviceInfo = getDeviceInfo();
    const encodedDeviceInfo = btoa(JSON.stringify(deviceInfo));
    
    const response = await fetchWithErrorHandling<{ url: string }>(
      `${API_BASE_URL}/auth/oauth/42/init?device_info=${encodedDeviceInfo}`
    );
    return response.url;
  },
  
  // Verify 2FA token
  async verify2FA(token: string, code: string): Promise<AuthResponse> {
    const requestBody = {
      token,
      code,
      device_info: getDeviceInfo()
    };
    
    const response = await fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Store token in memory
    setAccessToken(response.access_token, response.expires_in);
    
    return response;
  },
  
  // Manage devices
  async getUserDevices(): Promise<DeviceInfo[]> {
    const user = await this.getCurrentUser();
    return user.devices || [];
  },
  
  async revokeDevice(deviceId: string): Promise<void> {
    await fetchWithErrorHandling(`${API_BASE_URL}/auth/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },
  
  // Check if session is active
  isSessionActive
};

// User API service
export const userApi = {
  // Get user profile
  async getUserProfile(): Promise<User> {
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/user/profile`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  // Update user profile
  async updateUserProfile(data: Partial<User>): Promise<User> {
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },
};

export default {
  auth: authApi,
  user: userApi,
  getDeviceInfo,
  isSessionActive,
  getAccessToken,
  setAccessToken,
  clearAccessToken
};