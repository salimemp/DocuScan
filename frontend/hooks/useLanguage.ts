import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import i18n, { changeLanguage, isRTL, LANGUAGES, LanguageCode } from '../i18n/i18n';

export const useLanguage = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(i18nInstance.language as LanguageCode);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as LanguageCode);
      // Update RTL setting
      const shouldBeRTL = isRTL(lng as LanguageCode);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        // Note: App needs to restart for RTL changes to take effect
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    changeLanguage(lang);
  }, []);

  const getCurrentLanguageInfo = useCallback(() => {
    return LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];
  }, [currentLanguage]);

  return {
    t,
    currentLanguage,
    setLanguage,
    getCurrentLanguageInfo,
    languages: LANGUAGES,
    isRTL: isRTL(currentLanguage),
  };
};

export default useLanguage;
