import React, { ButtonHTMLAttributes } from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  // Base button classes
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-transparent focus:ring-gray-500 disabled:bg-gray-100',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-600 hover:bg-green-700 text-white border border-transparent focus:ring-green-500 disabled:bg-green-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent focus:ring-gray-500 disabled:bg-transparent disabled:text-gray-300',
  };
  
  // Width class
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Icon spacing
  const iconClass = icon 
    ? iconPosition === 'left' 
      ? 'space-x-2' 
      : 'flex-row-reverse space-x-2 space-x-reverse' 
    : '';
  
  // Loading state
  const isDisabled = disabled || loading;
  
  // Spinner color based on variant
  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return 'border-white';
      default:
        return '';
    }
  };
  
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${iconClass} ${className} ${isDisabled ? 'cursor-not-allowed' : ''}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className={getSpinnerColor()} />
      ) : icon ? (
        <span className="inline-flex">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;