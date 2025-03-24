import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from './Toast';

// Unique ID generator for toasts
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Toast data interface
export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

// Toast context interface
interface ToastContextProps {
  toasts: ToastData[];
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

// Create toast context
const ToastContext = createContext<ToastContextProps>({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
  removeAllToasts: () => {},
});

// Toast provider props
interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

// Toast provider component
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Add a new toast
  const showToast = useCallback(
    ({ type, message, title, duration }: Omit<ToastData, 'id'>) => {
      setToasts((prevToasts) => {
        // Create a new toast with unique ID
        const newToast: ToastData = {
          id: generateId(),
          type,
          message,
          title,
          duration,
        };

        // Add new toast and limit to maxToasts
        return [...prevToasts, newToast].slice(-maxToasts);
      });
    },
    [maxToasts]
  );

  // Remove a toast by ID
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Remove all toasts
  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, removeAllToasts }}
    >
      {children}
      
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed right-0 top-0 z-50 p-4 space-y-3 w-full max-w-md">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              type={toast.type}
              message={toast.message}
              title={toast.title}
              duration={toast.duration}
              onDismiss={removeToast}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToast = (): Pick<ToastContextProps, 'showToast' | 'removeToast' | 'removeAllToasts'> => {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return {
    showToast: context.showToast,
    removeToast: context.removeToast,
    removeAllToasts: context.removeAllToasts,
  };
};

export default ToastContext;