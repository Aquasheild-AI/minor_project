import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('aquashield_language') || 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already safely escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'aquashield_language',
      caches: ['localStorage'],
    },
  });

export default i18n;
