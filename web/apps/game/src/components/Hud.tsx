import { useTranslation } from 'react-i18next';
import { useInventory, useMe } from '../api/hooks';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';
import { LanguageSwitcher } from './LanguageSwitcher';

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span className={`text-lg font-bold ${color}`}>{Math.round(value)}</span>
      <span className="text-[10px] uppercase tracking-widest text-neon-cyan/70">{label}</span>
    </div>
  );
}

export function Hud() {
  const { t } = useTranslation();
  const me = useMe();
  const inv = useInventory();
  const logout = useAuth((s) => s.logout);
  const glitch = useGame((s) => s.glitch);
  const totalEntropy = useGame((s) => s.totalEntropy);

  const protein = inv.data?.protein ?? me.data?.protein ?? 0;
  const carbs = inv.data?.carbs ?? me.data?.carbs ?? 0;
  const lipids = inv.data?.lipids ?? me.data?.lipids ?? 0;

  return (
    <header className="panel flex items-center justify-between px-5 py-3">
      <div>
        <div className="glitch-text text-lg font-bold text-neon-green">GLITCH SALVAGE</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-neon-magenta">
          {t('hud.operator')}: {me.data?.username ?? '...'} // {t('common.level')}{' '}
          {me.data?.level ?? 1} // {me.data?.xp ?? 0} {t('common.xp')}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Stat label={t('common.protein')} value={protein} color="text-neon-green" />
        <Stat label={t('common.carbs')} value={carbs} color="text-neon-cyan" />
        <Stat label={t('common.lipids')} value={lipids} color="text-neon-magenta" />
        <div className="flex flex-col items-end leading-none">
          <span className="text-lg font-bold text-neon-magenta">{(glitch * 100).toFixed(0)}%</span>
          <span className="text-[10px] uppercase tracking-widest text-neon-cyan/70">
            {t('common.entropy')} {totalEntropy.toFixed(2)}
          </span>
        </div>
        <LanguageSwitcher />
        <button
          onClick={logout}
          className="rounded border border-neon-magenta/50 px-3 py-1 text-xs text-neon-magenta hover:bg-neon-magenta/10"
        >
          {t('hud.eject')}
        </button>
      </div>
    </header>
  );
}
