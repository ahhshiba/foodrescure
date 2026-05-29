import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

export const LANG_KEY = 'glitch_lang';
const stored = localStorage.getItem(LANG_KEY);

void i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: stored ?? 'zh-TW',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: string): void {
  localStorage.setItem(LANG_KEY, lng);
  void i18n.changeLanguage(lng);
}

export default i18n;
