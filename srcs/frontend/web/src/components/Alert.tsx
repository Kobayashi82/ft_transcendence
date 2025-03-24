import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, X as CloseIcon } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onDismiss,
  className = '',
}) => {
  // Define styles based on alert type
  const styles = {
    success: {
      container: 'bg-green-50',
      icon: 'text-green-400',
      title: 'text-green-800',
      message: 'text-green-700',
      button: 'text-green-500 hover:bg-green-100'
    },
    error: {
      container: 'bg-red-50',
      icon: 'text-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'text-red-500 hover:bg-red-100'
    },
    warning: {
      container: 'bg-yellow-50',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'text-yellow-500 hover:bg-yellow-100'
    },
    info: {
      container: 'bg-blue-50',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'text-blue-500 hover:bg-blue-100'
    }
  };

  // Select the appropriate icon
  const Icon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className={`h-5 w-5 ${styles[type].icon}`} />;
      case 'error':
        return <XCircle className={`h-5 w-5 ${styles[type].icon}`} />;
      case 'warning':
        return <AlertCircle className={`h-5 w-5 ${styles[type].icon}`} />;
      case 'info':
        return <Info className={`h-5 w-5 ${styles[type].icon}`} />;
      default:
        return <Info className={`h-5 w-5 ${styles['info'].icon}`} />;
    }
  };

  return (
    <div className={`rounded-md p-4 ${styles[type].container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles[type].title}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles[type].message} ${title ? 'mt-2' : ''}`}>
            {message}
          </div>
        </div>
        {onDismiss && (
          <div className="pl-3 ml-auto">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${styles[type].button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <span className="sr-only">Dismiss</span>
                <CloseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;