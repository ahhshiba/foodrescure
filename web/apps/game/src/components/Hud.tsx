import { useTranslation } from 'react-i18next';
import { useInventory, useMe, useBindCard } from '../api/hooks';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GameManual } from './GameManual';

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center md:items-end leading-none">
      <span className={`text-sm md:text-lg font-bold ${color}`}>{Math.round(value)}</span>
      <span className="text-[8px] md:text-[10px] text-zen-light mt-1">{label}</span>
    </div>
  );
}

export function Hud() {
  const { t } = useTranslation();
  const me = useMe();
  const inv = useInventory();
  const bindCard = useBindCard();
  const logout = useAuth((s) => s.logout);
  const glitch = useGame((s) => s.glitch);
  const totalEntropy = useGame((s) => s.totalEntropy);

  const protein = inv.data?.protein ?? me.data?.protein ?? 0;
  const carbs = inv.data?.carbs ?? me.data?.carbs ?? 0;
  const lipids = inv.data?.lipids ?? me.data?.lipids ?? 0;

  return (
    <header className="panel flex flex-col md:flex-row items-center justify-between p-3 md:px-5 md:py-3 gap-2 md:gap-6 shrink-0">
      <div className="flex items-center gap-4">
        {/* Minimal Avatar */}
        <div className="relative shrink-0">
          <div className="h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-full border border-zen-border bg-[#f8f6f2] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-8 w-8 text-zen-light" fill="currentColor">
              <path d="M50 55c-15 0-25-10-25-25s10-25 25-25 25 10 25 25-10 25-25 25zm0 5c18 0 35 15 35 40H15c0-25 17-40 35-40z" />
            </svg>
          </div>
          {/* Level Badge */}
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full border border-white bg-zen-accent text-[8px] md:text-[9px] font-bold text-white">
            {me.data?.level ?? 1}
          </div>
        </div>

        <div className="text-left">
          <div className="text-sm md:text-lg font-bold text-zen-text tracking-wide">GLITCH SALVAGE</div>
          <div className="text-[10px] md:text-[11px] text-zen-light mt-0.5">
            {t('hud.operator')}: <span className="text-zen-text font-bold">{me.data?.username ?? '...'}</span>
          </div>
          <div className="text-[9px] md:text-[10px] text-zen-primary mt-0.5 opacity-80">
            {me.data?.xp ?? 0} {t('common.xp')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 md:gap-6 w-full md:w-auto">
        <Stat label={t('common.protein')} value={protein} color="text-zen-accent" />
        <Stat label={t('common.carbs')} value={carbs} color="text-zen-primary" />
        <Stat label={t('common.lipids')} value={lipids} color="text-zen-alert" />
        <div className="flex flex-col items-center md:items-end leading-none">
          <span className="text-sm md:text-lg font-bold text-zen-alert">{(glitch * 100).toFixed(0)}%</span>
          <span className="text-[8px] md:text-[10px] text-zen-light mt-1">
            {t('common.entropy')} {totalEntropy.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 mt-1 md:mt-0 w-full md:w-auto">
          {/* PI_LINK STATUS BOX */}
          <div className="flex items-center gap-2 rounded border border-zen-border bg-[#f8f6f2] px-2 py-0.5 md:px-3 md:py-1">
            <div className="h-2 w-2 rounded-full bg-zen-accent animate-pulse"></div>
            <span className="text-[9px] md:text-[11px] font-mono text-zen-accent whitespace-nowrap">
              PI_LINK: ACTIVE <span className="opacity-70 ml-1">MS:24</span>
            </span>
          </div>

          <GameManual />
          <LanguageSwitcher />
          <button
            onClick={() => {
              const rfid = window.prompt('請輸入要綁定的實體卡片 UID (例如: F002F75F):');
              if (rfid) {
                bindCard.mutate(rfid, {
                  onSuccess: () => window.alert('卡片綁定成功！'),
                  onError: (err: any) => window.alert('綁定失敗: ' + err.message)
                });
              }
            }}
            disabled={bindCard.isPending}
            className="rounded border border-zen-border px-2 py-1 md:px-3 text-[10px] md:text-xs text-zen-text disabled:opacity-50 flex items-center gap-1 font-bold hover:bg-[#f8f6f2] bg-white shadow-sm"
          >
            💳 {bindCard.isPending ? '綁定中...' : '綁定實體卡'}
          </button>
          <button
            onClick={logout}
            className="rounded border border-zen-alert/30 px-2 py-1 md:px-3 text-[10px] md:text-xs text-zen-alert hover:bg-[#fae6e5] bg-white shadow-sm font-medium"
          >
            {t('hud.eject')}
          </button>
        </div>
      </div>
    </header>
  );
}
