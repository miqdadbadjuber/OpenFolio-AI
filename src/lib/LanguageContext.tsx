import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  id: {
    'profile': 'Profil',
    'language': 'Bahasa',
    'display': 'Tampilan',
    'usage': 'Penggunaan',
    'data': 'Data',
    'about': 'Tentang',
    'logout': 'Logout',
    'new_project': 'Buat Portfolio',
    'recent': 'Terakhir Dibuka',
    'settings': 'Pengaturan',
    'upgrade': 'Upgrade Pro',
    'history_empty': 'Belum ada riwayat',
    'rename': 'Ganti Nama',
    'delete': 'Hapus',
    'pin': 'Pin',
    'unpin': 'Unpin',
    'openfolio_ai': 'OpenFolio AI',
  },
  en: {
    'profile': 'Profile',
    'language': 'Language',
    'display': 'Display',
    'usage': 'Usage',
    'data': 'Data',
    'about': 'About',
    'logout': 'Logout',
    'new_project': 'New Portfolio',
    'recent': 'Recent',
    'settings': 'Settings',
    'upgrade': 'Upgrade Pro',
    'history_empty': 'No history yet',
    'rename': 'Rename',
    'delete': 'Delete',
    'pin': 'Pin',
    'unpin': 'Unpin',
    'openfolio_ai': 'OpenFolio AI',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'id',
  setLang: () => {},
  t: (key) => key
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('openfolio_lang') as Language) || 'id';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('openfolio_lang', newLang);
  };

  const t = (key: string) => {
    return (translations[lang] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
