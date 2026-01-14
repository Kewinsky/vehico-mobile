import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './resources/en';
import { pl } from './resources/pl';

export const defaultLanguage = 'en' as const;
export type SupportedLanguage = 'en' | 'pl';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };

