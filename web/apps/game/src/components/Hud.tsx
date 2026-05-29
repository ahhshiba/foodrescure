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
      <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-neon-cyan/70">{label}</span>
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
      <div className="flex items-center gap-3">
        {/* Character Avatar */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-pulse rounded-full bg-neon-cyan/20 blur-sm"></div>
          <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-full border-2 border-neon-cyan bg-black/80 shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            <svg viewBox="0 0 100 100" className="h-full w-full text-neon-cyan opacity-80" fill="currentColor">
              <path d="M50 55c-15 0-25-10-25-25s10-25 25-25 25 10 25 25-10 25-25 25zm0 5c18 0 35 15 35 40H15c0-25 17-40 35-40z" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
            {/* Holographic scanline effect overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_4px]"></div>
          </div>
          {/* Level Badge */}
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full border border-black bg-neon-magenta text-[8px] md:text-[9px] font-bold text-black shadow-magenta">
            {me.data?.level ?? 1}
          </div>
        </div>

        <div className="text-left">
          <div className="glitch-text text-sm md:text-lg font-bold text-neon-green tracking-wider drop-shadow-md">GLITCH SALVAGE</div>
          <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-neon-cyan drop-shadow-[0_0_2px_rgba(0,255,255,0.8)] mt-0.5">
            {t('hud.operator')}: <span className="text-white font-bold">{me.data?.username ?? '...'}</span>
          </div>
          <div className="text-[8px] md:text-[9px] uppercase tracking-widest text-neon-magenta mt-0.5 opacity-80">
            {me.data?.xp ?? 0} {t('common.xp')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 md:gap-6 w-full md:w-auto">
        <Stat label={t('common.protein')} value={protein} color="text-neon-green" />
        <Stat label={t('common.carbs')} value={carbs} color="text-neon-cyan" />
        <Stat label={t('common.lipids')} value={lipids} color="text-neon-magenta" />
        <div className="flex flex-col items-center md:items-end leading-none">
          <span className="text-sm md:text-lg font-bold text-neon-magenta">{(glitch * 100).toFixed(0)}%</span>
          <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-neon-cyan/70">
            {t('common.entropy')} {totalEntropy.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* PI_LINK STATUS BOX */}
          <div className="flex items-center gap-2 rounded-none border border-neon-green/80 bg-black/60 px-2 py-0.5 md:px-3 md:py-1 shadow-[0_0_8px_rgba(57,255,20,0.3)]">
            <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse"></div>
            <span className="text-[9px] md:text-[11px] font-mono text-neon-green tracking-wider whitespace-nowrap">
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
            className="btn-cyber btn-cyber-cyan rounded-none border border-neon-yellow/80 px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs text-neon-yellow disabled:opacity-50 flex items-center gap-1 font-bold shadow-[0_0_10px_rgba(255,255,0,0.3)]"
          >
            💳 {bindCard.isPending ? '綁定中...' : '綁定實體卡'}
          </button>
          <button
            onClick={logout}
            className="btn-cyber rounded-none border border-neon-magenta/50 px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs text-neon-magenta hover:bg-neon-magenta/10 shadow-[0_0_5px_rgba(255,0,255,0.3)]"
          >
            {t('hud.eject')}
          </button>
        </div>
      </div>
    </header>
  );
}
