import React, { createContext, useContext } from 'react';
import { useTranslation, TranslationContextType } from '../hooks/useTranslation';

// Create the context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Provider component
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const translation = useTranslation();

  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use translation
export const useAppTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useAppTranslation must be used within a TranslationProvider');
  }
  return context;
}; 