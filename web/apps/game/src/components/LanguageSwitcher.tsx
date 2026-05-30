import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'zh-TW' ? 'en' : 'zh-TW';
  return (
    <button
      onClick={() => setLanguage(next)}
      className="btn-cyber rounded border border-zen-border px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs text-zen-text hover:bg-[#f8f6f2]"
      title="Language"
    >
      {t('lang.toggle')}
    </button>
  );
}
