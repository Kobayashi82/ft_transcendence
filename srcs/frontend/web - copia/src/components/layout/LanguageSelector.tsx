import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, LanguageCode } from '../../contexts/LanguageContext';

// Language flag component
const LanguageFlag: React.FC<{ code: string }> = ({ code }) => {
  // Simple SVG flags with proper aspect ratios
  const renderFlag = () => {
    switch (code) {
      case 'en':
        return (
          <span role="img" aria-label="English" className="flex-shrink-0 w-6 h-4 rounded overflow-hidden shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-full h-full">
              <clipPath id="a">
                <path d="M0 0v30h60V0z"/>
              </clipPath>
              <clipPath id="b">
                <path d="M30 15h30v15zv15H0zH0V0zV0h30z"/>
              </clipPath>
              <g clipPath="url(#a)">
                <path d="M0 0v30h60V0z" fill="#012169"/>
                <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
              </g>
            </svg>
          </span>
        );
      case 'es':
        return (
          <span role="img" aria-label="Spanish" className="flex-shrink-0 w-6 h-4 rounded overflow-hidden shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500" className="w-full h-full">
              <rect width="750" height="500" fill="#c60b1e"/>
              <rect width="750" height="250" fill="#ffc400" y="125"/>
            </svg>
          </span>
        );
      case 'fr':
        return (
          <span role="img" aria-label="French" className="flex-shrink-0 w-6 h-4 rounded overflow-hidden shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-full h-full">
              <rect width="300" height="600" fill="#002654"/>
              <rect width="300" height="600" fill="#fff" x="300"/>
              <rect width="300" height="600" fill="#ce1126" x="600"/>
            </svg>
          </span>
        );
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  return renderFlag();
};

interface LanguageSelectorProps {
  isMobile?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isMobile = false }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Language options
  const languages = [
    { code: 'en', name: t('english') },
    { code: 'es', name: t('spanish') },
    { code: 'fr', name: t('french') },
  ];

  // Handle click outside to close dropdown (only for desktop)
  useEffect(() => {
    if (isMobile) return; // Skip for mobile

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  // Handle language change
  const handleLanguageChange = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // For mobile, render a simpler version with horizontal buttons
  if (isMobile) {
    return (
      <div className="flex justify-start space-x-2 px-2 py-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as LanguageCode)}
            className={`flex items-center justify-center p-2 rounded-lg ${
              language === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            aria-label={lang.name}
            title={lang.name}
          >
            <LanguageFlag code={lang.code} />
          </button>
        ))}
      </div>
    );
  }

  // Desktop version with dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 h-9 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('language')}
        title={t('language')}
      >
        <LanguageFlag code={language} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-gray-800 ring-1 ring-gray-700 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                  language === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                role="menuitem"
              >
                <div className="flex items-center justify-center">
                  <LanguageFlag code={lang.code} />
                </div>
                <span className="ml-3">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;