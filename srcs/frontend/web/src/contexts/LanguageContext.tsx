import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export type LanguageCode = 'en' | 'es' | 'fr';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
  isUserSelected: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  isUserSelected: false,
});

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {

  const getInitialLanguage = (): { code: LanguageCode, isUserSelected: boolean } => {

    const savedLanguage = localStorage.getItem('language') as LanguageCode;
    const hasUserPreference = localStorage.getItem('hasUserSelectedLanguage') === 'true';
    
    if (savedLanguage && hasUserPreference && ['en', 'es', 'fr'].includes(savedLanguage)) {
      return { code: savedLanguage, isUserSelected: true };
    }
    
    try {
      const browserLangs = navigator.languages || [navigator.language];
      for (const lang of browserLangs) {
        const langCode = lang.split('-')[0].toLowerCase();
        if (['en', 'es', 'fr'].includes(langCode)) {
          return { code: langCode as LanguageCode, isUserSelected: false };
        }
      }
    } catch (error) {
      console.error('Error detecting browser language:', error);
    }   

    return { code: 'en', isUserSelected: false };
  };

  const initialLanguageData = getInitialLanguage();
  const [language, setLanguageState] = useState<LanguageCode>(initialLanguageData.code);
  const [isUserSelected, setIsUserSelected] = useState<boolean>(initialLanguageData.isUserSelected);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const setLanguage = (newLanguage: LanguageCode) => {
    setLanguageState(newLanguage);
    setIsUserSelected(true);
    localStorage.setItem('language', newLanguage);
    localStorage.setItem('hasUserSelectedLanguage', 'true');
    document.documentElement.lang = newLanguage;
  };

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationsModule = await import(`../translations/${language}.ts`);
        setTranslations(translationsModule.default);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);

        if (language !== 'en') {
          const fallbackModule = await import('../translations/en.ts');
          setTranslations(fallbackModule.default);
        }
      }
    };

    loadTranslations();
  }, [language]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = (key: string): string => { return translations[key] || key; };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isUserSelected }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
