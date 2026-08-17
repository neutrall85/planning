/**
 * i18n Hook and Context
 * Provides translation functionality throughout the application
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Language, Translation, translations, defaultLanguage } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: <K extends keyof Translation>(section: K, key: keyof Translation[K]) => string;
  tCommon: (key: keyof Translation['common']) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLanguage = defaultLanguage,
}) => {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const t = useCallback(<K extends keyof Translation>(
    section: K,
    key: keyof Translation[K]
  ): string => {
    const sectionTranslations = translations[language][section];
    if (!sectionTranslations) {
      console.warn(`Translation section "${section}" not found for language "${language}"`);
      return key as string;
    }
    
    const value = (sectionTranslations as Record<string, string>)[key as string];
    if (!value) {
      console.warn(`Translation key "${key as string}" not found in section "${section}" for language "${language}"`);
      return key as string;
    }
    
    return value;
  }, [language]);

  const tCommon = useCallback((key: keyof Translation['common']): string => {
    return t('common', key);
  }, [t]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    tCommon,
  }), [language, t, tCommon]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export default useI18n;
