import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import en from '@/translations/en.json';
import it from '@/translations/it.json';
import { Storage } from './storage';

type Language = 'it' | 'en';
type Translations = typeof it;

const LANG_KEY = 'app_language';

const translations: Record<Language, Translations> = { it, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => {
  const stored = Storage.getString(LANG_KEY) as Language | undefined;
  const initial: Language = stored === 'en' || stored === 'it' ? stored : 'it';

  return {
    language: initial,

    setLanguage: (lang: Language) => {
      Storage.set(LANG_KEY, lang);
      set({ language: lang });
    },

    t: (key: string) => {
      const { language } = get();
      return getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
    },
  };
});

export const useI18n = () =>
  useI18nStore(
    useShallow((s) => ({
      language: s.language,
      setLanguage: s.setLanguage,
      t: s.t,
    })),
  );
