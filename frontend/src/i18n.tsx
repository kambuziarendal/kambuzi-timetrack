import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';

type Lang = 'en' | 'no';
type LanguageContextValue = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  tr: (en: string, no: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  tr: (en) => en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = globalThis.localStorage?.getItem('timetrack-language') as Lang | null;
      if (saved === 'en' || saved === 'no') setLanguageState(saved);
    } catch {}
  }, []);

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    try { globalThis.localStorage?.setItem('timetrack-language', lang); } catch {}
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    tr: (en: string, no: string) => language === 'no' ? no : en,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
    <Button compact mode={language === 'en' ? 'contained' : 'outlined'} onPress={() => setLanguage('en')}>EN</Button>
    <Button compact mode={language === 'no' ? 'contained' : 'outlined'} onPress={() => setLanguage('no')}>NO</Button>
  </View>;
}
