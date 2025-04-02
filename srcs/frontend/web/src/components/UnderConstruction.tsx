import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const UnderConstruction: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">{t('construction.title')}</h1>
        <p className="text-xl text-gray-400">{t('construction.message')}</p>
      </div>
    </div>
  );
};

export default UnderConstruction;