// Date utility functions for consistent date formatting across the application

/**
 * Format a date string or Date object to a human-readable date and time
 * @param dateString Date string or Date object
 * @returns Formatted date string
 */
export const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
};

/**
 * Format a date string or Date object to a human-readable date only
 * @param dateString Date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
};

/**
 * Format a date string or Date object to a human-readable time only
 * @param dateString Date string or Date object
 * @returns Formatted time string
 */
export const formatTime = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return String(dateString);
  }
};

/**
 * Calculate and format the time elapsed since a given date
 * @param dateString Date string or Date object
 * @returns Human-readable time elapsed
 */
export const formatTimeElapsed = (dateString?: string | Date): string => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Return empty string for future dates
    if (diffMs < 0) return '';
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    console.error('Error calculating time elapsed:', error);
    return '';
  }
};

/**
 * Format duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds && seconds !== 0) return 'N/A';
  
  try {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  } catch (error) {
    console.error('Error formatting duration:', error);
    return String(seconds);
  }
};

/**
 * Check if a date is today
 * @param dateString Date string or Date object
 * @returns Boolean indicating if the date is today
 */
export const isToday = (dateString?: string | Date): boolean => {
  if (!dateString) return false;
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const today = new Date();
    
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

export default {
  formatDateTime,
  formatDate,
  formatTime,
  formatTimeElapsed,
  formatDuration,
  isToday
};