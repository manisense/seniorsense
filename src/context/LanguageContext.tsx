import React, { createContext, useContext, useState } from 'react';
import { I18n } from 'i18n-js';
import translations from '../i18n/translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  i18n: I18n;
}

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  i18n,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const updateLanguage = (lang: string) => {
    i18n.locale = lang;
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage, i18n }}>
      {children}
    </LanguageContext.Provider>
  );
};