import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import split locale files
import { en } from './locales/en';
import { ko } from './locales/ko';

// Import remaining languages from main file for now (can be split later)
import translations, { LanguageCode, LANGUAGES } from './translations';

const LANGUAGE_STORAGE_KEY = '@DocScanPro:language';

// Combine English and Korean from split files with rest from main
const resources = {
  en: { translation: en },
  ko: { translation: ko },
  es: { translation: translations.es },
  fr: { translation: translations.fr },
  de: { translation: translations.de },
  ar: { translation: translations.ar },
  zh: { translation: translations.zh },
  ja: { translation: translations.ja },
  pt: { translation: translations.pt },
  hi: { translation: translations.hi },
  ta: { translation: translations.ta },
  bn: { translation: translations.bn },
  he: { translation: translations.he },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

// Load saved language on init
export const loadSavedLanguage = async (): Promise<LanguageCode> => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
      i18n.changeLanguage(savedLang);
      return savedLang as LanguageCode;
    }
  } catch (e) {
    console.log('Failed to load saved language:', e);
  }
  return 'en';
};

export const changeLanguage = async (lang: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    i18n.changeLanguage(lang);
  } catch (e) {
    console.log('Failed to save language:', e);
    i18n.changeLanguage(lang);
  }
};

export const getCurrentLanguage = (): LanguageCode => {
  return i18n.language as LanguageCode;
};

export const isRTL = (lang?: LanguageCode): boolean => {
  const currentLang = lang || getCurrentLanguage();
  const langInfo = LANGUAGES.find(l => l.code === currentLang);
  return langInfo?.rtl || false;
};

export { LANGUAGES };
export type { LanguageCode };
export default i18n;
