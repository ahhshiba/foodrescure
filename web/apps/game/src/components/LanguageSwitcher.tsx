import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'zh-TW' ? 'en' : 'zh-TW';
  return (
    <button
      onClick={() => setLanguage(next)}
      className="rounded border border-neon-cyan/50 px-2 py-1 text-xs text-neon-cyan hover:bg-neon-cyan/10"
      title="Language"
    >
      {t('lang.toggle')}
    </button>
  );
}
