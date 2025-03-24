import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ 
  password,
  className = '' 
}) => {
  // Calculate password strength score
  const calculateStrength = (password: string): StrengthLevel => {
    if (!password) return 'weak';
    
    // Initialize score
    let score = 0;
    
    // Add points for password length
    if (password.length > 8) score += 1;
    if (password.length > 12) score += 1;
    
    // Check for character types and add points
    if (/[A-Z]/.test(password)) score += 1; // Uppercase
    if (/[a-z]/.test(password)) score += 1; // Lowercase
    if (/\d/.test(password)) score += 1;    // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Special characters
    
    // Determine strength level based on score
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 5) return 'strong';
    return 'very-strong';
  };
  
  // Get visual properties based on strength
  const getStrengthInfo = (level: StrengthLevel) => {
    switch (level) {
      case 'weak':
        return {
          color: 'bg-red-500',
          width: 'w-1/4',
          text: 'Weak',
          textColor: 'text-red-500',
        };
      case 'medium':
        return {
          color: 'bg-yellow-500',
          width: 'w-2/4',
          text: 'Medium',
          textColor: 'text-yellow-600',
        };
      case 'strong':
        return {
          color: 'bg-green-500',
          width: 'w-3/4',
          text: 'Strong',
          textColor: 'text-green-600',
        };
      case 'very-strong':
        return {
          color: 'bg-green-700',
          width: 'w-full',
          text: 'Very Strong',
          textColor: 'text-green-700',
        };
    }
  };
  
  // Calculate strength
  const strengthLevel = calculateStrength(password);
  const { color, width, text, textColor } = getStrengthInfo(strengthLevel);
  
  return (
    <div className={`mt-1 ${className}`}>
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} ${width} transition-all duration-300`}></div>
      </div>
      {password && (
        <p className={`text-xs mt-1 ${textColor}`}>
          Password strength: {text}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;