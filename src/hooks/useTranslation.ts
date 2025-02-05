import { useLanguage } from '../context/LanguageContext';
import { I18n } from 'i18n-js';

export interface TranslationContextType {
  t: (key: string, params?: {}) => string;
  locale: string;
  setLocale: (locale: string) => void;
}

export const useTranslation = (): TranslationContextType => {
  const { i18n } = useLanguage();

  return {
    t: (key: string, params = {}) => i18n.t(key, params),
    locale: i18n.locale,
    setLocale: (locale: string) => {
      i18n.locale = locale;
    },
  };
};