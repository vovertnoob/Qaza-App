import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEEN_CATEGORY_LABELS,
  PRAYER_HINTS_I18N,
  PRAYER_LABELS_I18N,
  ROUTINE_I18N,
  translateUnit,
  type AppLanguage,
} from '../lib/i18n';
import type { DeenCategory, DeenTask, PrayerType, RoutineType } from '../types/qaza';

const LANG_STORAGE_KEY = 'qazaflow_lang_v1';

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  tr: (enText: string, hiText: string) => string;
  prayerLabel: (prayer: PrayerType | 'all') => string;
  prayerHint: (prayer: PrayerType) => string;
  routineInfo: (routine: RoutineType) => { title: string; description: string };
  deenCategoryLabel: (cat: DeenCategory) => string;
  deenTaskTitle: (task: Pick<DeenTask, 'title' | 'titleHi'>) => string;
  deenUnit: (unit: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function loadInitialLang(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'hi' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => loadInitialLang());

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  const tr = useCallback(
    (enText: string, hiText: string) => (lang === 'hi' ? hiText : enText),
    [lang]
  );

  const prayerLabel = useCallback(
    (prayer: PrayerType | 'all') => PRAYER_LABELS_I18N[lang][prayer],
    [lang]
  );

  const prayerHint = useCallback(
    (prayer: PrayerType) => PRAYER_HINTS_I18N[lang][prayer],
    [lang]
  );

  const routineInfo = useCallback(
    (routine: RoutineType) => ROUTINE_I18N[lang][routine],
    [lang]
  );

  const deenCategoryLabel = useCallback(
    (cat: DeenCategory) => DEEN_CATEGORY_LABELS[lang][cat],
    [lang]
  );

  const deenTaskTitle = useCallback(
    (task: Pick<DeenTask, 'title' | 'titleHi'>) =>
      lang === 'hi' && task.titleHi ? task.titleHi : task.title,
    [lang]
  );

  const deenUnit = useCallback((unit: string) => translateUnit(lang, unit), [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        tr,
        prayerLabel,
        prayerHint,
        routineInfo,
        deenCategoryLabel,
        deenTaskTitle,
        deenUnit,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
