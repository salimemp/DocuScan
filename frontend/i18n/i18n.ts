import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all split locale files
import { en } from './locales/en';
import { ko } from './locales/ko';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { ar } from './locales/ar';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { pt } from './locales/pt';
import { hi } from './locales/hi';
import { ta } from './locales/ta';
import { bn } from './locales/bn';
import { he } from './locales/he';
import { LANGUAGES, LanguageCode } from './translations';

const LANGUAGE_STORAGE_KEY = '@DocScanPro:language';

// All resources from split files
const resources = {
  en: { translation: en },
  ko: { translation: ko },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
  pt: { translation: pt },
  hi: { translation: hi },
  ta: { translation: ta },
  bn: { translation: bn },
  he: { translation: he },
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
