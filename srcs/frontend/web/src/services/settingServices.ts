import { User } from './api';

const API_BASE_URL = `/api`;

// Interface for profile update data
export interface ProfileUpdateData {
  username?: string;
  email?: string;
  avatar?: string;
}

// Interface for password update data
export interface PasswordUpdateData {
  current_password: string;
  new_password: string;
}

// Interface for notification settings
export interface NotificationSettings {
  email_notifications: boolean;
  security_alerts: boolean;
  marketing_emails: boolean;
}

// Settings service for managing user profile and preferences
export const settingsService = {
  // Get user profile
  async getUserProfile(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to fetch user profile: ${response.status}`);
    }

    return response.json();
  },

  // Update user profile
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to update profile: ${response.status}`);
    }

    return response.json();
  },

  // Update user password
  async updatePassword(data: PasswordUpdateData): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/password/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to update password: ${response.status}`);
    }

    return response.json();
  },

  // Get notification settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await fetch(`${API_BASE_URL}/user/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to fetch notification settings: ${response.status}`);
    }

    return response.json();
  },

  // Update notification settings
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await fetch(`${API_BASE_URL}/user/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to update notification settings: ${response.status}`);
    }

    return response.json();
  },

  // Delete user account
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/user`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to delete account: ${response.status}`);
    }

    return response.json();
  }
};

export default settingsService;