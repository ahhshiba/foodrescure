import { useTranslation } from 'react-i18next';
import { useInventory, useUpgradeNanos } from '../api/hooks';

const ACCENT: Record<string, string> = {
  welder_spider: 'text-neon-green',
  suction_jelly: 'text-neon-magenta',
  crawler: 'text-neon-cyan',
};

export function Workbench() {
  const { t } = useTranslation();
  const { data } = useInventory();
  const upgrade = useUpgradeNanos();

  return (
    <div className="panel flex h-full flex-col rounded-lg p-4">
      <h2 className="mb-3 text-sm font-bold text-neon-green">{t('workbench.title')}</h2>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {data?.nanos.map((n) => {
          const accent = ACCENT[n.nanos_type] ?? 'text-neon-green';
          return (
            <div key={n.nanos_type} className="rounded border border-neon-green/20 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${accent}`}>
                  {t(`workbench.${n.nanos_type}`, n.nanos_type)}
                </span>
                <span className="text-[10px] text-neon-cyan/70">
                  {t('common.level')} {n.level}
                </span>
              </div>
              <div className="mb-2 text-[10px] text-neon-cyan/60">
                {t(`workbench.${n.nanos_type}_blurb`, '')}
              </div>
              <button
                onClick={() => upgrade.mutate(n.nanos_type)}
                disabled={upgrade.isPending}
                className="w-full rounded bg-neon-green/15 py-1 text-[11px] font-bold text-neon-green ring-1 ring-neon-green/50 hover:bg-neon-green/25 disabled:opacity-40"
              >
                {t('workbench.upgrade')}
              </button>
            </div>
          );
        })}
        {!data && <div className="text-xs text-neon-cyan/60">{t('workbench.loading')}</div>}
      </div>
      {upgrade.isError && (
        <div className="mt-2 text-[10px] text-neon-magenta">
          ⚠ {(upgrade.error as Error).message}
        </div>
      )}
      {upgrade.isSuccess && (
        <div className="mt-2 text-[10px] text-neon-green">
          ↑ {upgrade.data.nanos_type} → {t('common.level')} {upgrade.data.new_level}
        </div>
      )}
    </div>
  );
}
