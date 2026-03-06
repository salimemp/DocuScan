import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import { translations, LanguageCode, TranslationKeys, LANGUAGES, Language } from './translations';

const LANGUAGE_STORAGE_KEY = '@docscan_language';

interface I18nContextType {
  language: LanguageCode;
  t: TranslationKeys;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  isRTL: boolean;
  languages: Language[];
  currentLanguage: Language;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  const loadStoredLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && translations[stored as LanguageCode]) {
        const lang = stored as LanguageCode;
        setLanguageState(lang);
        const langInfo = LANGUAGES.find(l => l.code === lang);
        if (langInfo) {
          setIsRTL(langInfo.rtl);
          if (Platform.OS !== 'web') {
            I18nManager.forceRTL(langInfo.rtl);
          }
        }
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: LanguageCode) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
      const langInfo = LANGUAGES.find(l => l.code === lang);
      if (langInfo) {
        setIsRTL(langInfo.rtl);
        if (Platform.OS !== 'web') {
          I18nManager.forceRTL(langInfo.rtl);
        }
      }
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const value: I18nContextType = {
    language,
    t: translations[language] || translations.en,
    setLanguage,
    isRTL,
    languages: LANGUAGES,
    currentLanguage,
  };

  return React.createElement(I18nContext.Provider, { value }, children);
};

export { translations, LANGUAGES };
export type { LanguageCode, TranslationKeys, Language };
