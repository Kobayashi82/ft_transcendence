import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  title,
  duration = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Handle auto-dismiss
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (duration > 0) {
      timer = setTimeout(() => {
        handleDismiss();
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [duration]);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsExiting(true);
    
    // Wait for animation to complete before removing
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(id);
    }, 300); // 300ms matches the transition duration
  };

  // If not visible, don't render
  if (!isVisible) return null;

  // Get styles based on toast type
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-400',
          icon: 'text-green-400',
          title: 'text-green-800',
          message: 'text-green-700',
          close: 'text-green-500 hover:bg-green-100',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-400',
          icon: 'text-red-400',
          title: 'text-red-800',
          message: 'text-red-700',
          close: 'text-red-500 hover:bg-red-100',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-400',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          close: 'text-yellow-500 hover:bg-yellow-100',
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-400',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          message: 'text-blue-700',
          close: 'text-blue-500 hover:bg-blue-100',
        };
    }
  };

  // Select the appropriate icon
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className={`h-5 w-5 ${styles.icon}`} />;
      case 'error':
        return <AlertCircle className={`h-5 w-5 ${styles.icon}`} />;
      case 'warning':
        return <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />;
      case 'info':
      default:
        return <Info className={`h-5 w-5 ${styles.icon}`} />;
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`relative transform transition-all duration-300 ease-in-out ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
      role="alert"
    >
      <div className={`max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto border-l-4 ${styles.container}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              {title && <p className={`text-sm font-medium ${styles.title}`}>{title}</p>}
              <p className={`text-sm ${styles.message} mt-1`}>{message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                className={`bg-transparent rounded-md inline-flex focus:outline-none ${styles.close}`}
                onClick={handleDismiss}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;