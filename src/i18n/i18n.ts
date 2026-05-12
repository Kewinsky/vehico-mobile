import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { APP_DISPLAY_NAME } from '../config/appBrand';
import { en } from './resources/en';
import { pl } from './resources/pl';

export const defaultLanguage = 'en' as const;
export type SupportedLanguage = 'en' | 'pl';

// Detect system language
function detectSystemLanguage(): SupportedLanguage {
  const systemLocale = Localization.getLocales()[0]?.languageCode;
  
  // Map system language to supported languages
  if (systemLocale === 'pl') {
    return 'pl';
  }
  
  // Default to English for all other languages
  return 'en';
}

const detectedLanguage = detectSystemLanguage();

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: detectedLanguage,
  fallbackLng: defaultLanguage,
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  interpolation: {
    escapeValue: false,
    defaultVariables: {
      appName: APP_DISPLAY_NAME,
    },
  },
});

export { i18n };

