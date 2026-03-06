import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations, { LanguageCode, LANGUAGES } from './translations';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translations.en },
      es: { translation: translations.es },
      fr: { translation: translations.fr },
      de: { translation: translations.de },
      ar: { translation: translations.ar },
      zh: { translation: translations.zh },
      ja: { translation: translations.ja },
      pt: { translation: translations.pt },
      hi: { translation: translations.hi },
      ko: { translation: translations.ko },
      ta: { translation: translations.ta },
      bn: { translation: translations.bn },
      he: { translation: translations.he },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export const changeLanguage = (lang: LanguageCode) => {
  i18n.changeLanguage(lang);
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
