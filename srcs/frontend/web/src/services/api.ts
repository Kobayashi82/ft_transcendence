// API service for making requests to the backend

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}/api`;

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
  refresh_token: string;
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
}

// API Error handler
class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Fetch wrapper with error handling
async function fetchWithErrorHandling<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `Error: ${response.status} ${response.statusText}`,
        response.status
      );
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
    return fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
  },
  
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    return fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },
  
  // Refresh token
  async refreshToken(token: string): Promise<AuthResponse> {
    return fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: token }),
      credentials: 'include',
    });
  },
  
  // Get current user info
  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('auth_token');
    
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
  },
  
  // Logout
  async logout(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    
    await fetchWithErrorHandling(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  },
  
  // Initialize OAuth login processes
  async getGoogleOAuthURL(): Promise<string> {
    const response = await fetchWithErrorHandling<{ url: string }>(`${API_BASE_URL}/auth/oauth/google/init`);
    return response.url;
  },
  
  async get42OAuthURL(): Promise<string> {
    const response = await fetchWithErrorHandling<{ url: string }>(`${API_BASE_URL}/auth/oauth/42/init`);
    return response.url;
  },
  
  // Verify 2FA token
  async verify2FA(token: string, code: string): Promise<AuthResponse> {
    return fetchWithErrorHandling<AuthResponse>(`${API_BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token,
        code
      }),
      credentials: 'include',
    });
  }
};

// User API service
export const userApi = {
  // Get user profile
  async getUserProfile(): Promise<User> {
    const token = localStorage.getItem('auth_token');
    
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
  },
  
  // Update user profile
  async updateUserProfile(data: Partial<User>): Promise<User> {
    const token = localStorage.getItem('auth_token');
    
    return fetchWithErrorHandling<User>(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },
};

export default {
  auth: authApi,
  user: userApi,
};