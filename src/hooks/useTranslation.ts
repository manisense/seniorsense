import { useLanguage } from '../context/LanguageContext';

export const useTranslation = () => {
  const { i18n } = useLanguage();

  return {
    t: (key: string, params = {}) => i18n.t(key, params),
  };
};