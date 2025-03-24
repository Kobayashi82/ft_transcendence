import { fetchWithErrorHandling } from './api';

const API_BASE_URL = `/api`;

// Interface for 2FA setup response
export interface TwoFactorSetupResponse {
  secret: string;
  qrcode: string;
  backup_codes: string[];
}

// Interface for 2FA verification response
export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
}

// Security service for handling user security operations
export const securityService = {
  // Change user password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return fetchWithErrorHandling<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/password/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },
  
  // Enable 2FA
  async enable2FA(): Promise<TwoFactorSetupResponse> {
    return fetchWithErrorHandling<TwoFactorSetupResponse>(`${API_BASE_URL}/auth/2fa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'app' }),
    });
  },
  
  // Verify 2FA setup with a code
  async verify2FASetup(code: string): Promise<TwoFactorVerifyResponse> {
    return fetchWithErrorHandling<TwoFactorVerifyResponse>(`${API_BASE_URL}/auth/2fa/verify-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, type: 'app' }),
    });
  },
  
  // Disable 2FA
  async disable2FA(): Promise<{ success: boolean; message: string }> {
    return fetchWithErrorHandling<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/2fa/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  // Log out all sessions (except current)
  async logoutAllSessions(): Promise<{ success: boolean; message: string }> {
    return fetchWithErrorHandling<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/sessions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  // Revoke specific session
  async revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return fetchWithErrorHandling<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};

// Export fetchWithErrorHandling for use by this and other services
export async function fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
  // Note: This is a simplified version - in a real app, we'd implement proper
  // error handling, authentication token management, etc. here.
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  // For 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export default securityService;