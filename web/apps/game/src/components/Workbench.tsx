import { useTranslation } from 'react-i18next';
import { useInventory, useUpgradeNanos } from '../api/hooks';

const ACCENT: Record<string, string> = {
  welder_spider: 'text-zen-primary',
  suction_jelly: 'text-zen-accent',
  crawler: 'text-zen-text',
};

export function Workbench() {
  const { t } = useTranslation();
  const { data } = useInventory();
  const upgrade = useUpgradeNanos();

  return (
    <div className="panel flex h-full flex-col rounded-xl p-4 bg-white border border-zen-border shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-zen-text">{t('workbench.title')}</h2>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {data?.nanos.map((n) => {
          const accent = ACCENT[n.nanos_type] ?? 'text-zen-text';
          return (
            <div key={n.nanos_type} className="rounded-lg border border-zen-border bg-[#fcfaf8] p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${accent} capitalize`}>
                  {t(`workbench.${n.nanos_type}`, n.nanos_type)}
                </span>
                <span className="text-[10px] text-zen-light font-medium">
                  {t('common.level')} {n.level}
                </span>
              </div>
              <div className="mb-3 text-[11px] text-zen-light leading-relaxed">
                {t(`workbench.${n.nanos_type}_blurb`, '')}
              </div>
              <button
                onClick={() => upgrade.mutate(n.nanos_type)}
                disabled={upgrade.isPending}
                className="w-full rounded-md bg-zen-primary/10 py-1.5 text-[11px] font-bold text-zen-primary ring-1 ring-zen-primary/20 hover:bg-zen-primary/20 disabled:opacity-40 transition-colors"
              >
                {t('workbench.upgrade')}
              </button>
            </div>
          );
        })}
        {!data && <div className="text-xs text-zen-light italic">{t('workbench.loading')}</div>}
      </div>
      {upgrade.isError && (
        <div className="mt-3 text-[11px] font-medium text-zen-alert">
          ⚠ {(upgrade.error as Error).message}
        </div>
      )}
      {upgrade.isSuccess && (
        <div className="mt-3 text-[11px] font-medium text-zen-accent">
          ↑ {upgrade.data.nanos_type} → {t('common.level')} {upgrade.data.new_level}
        </div>
      )}
    </div>
  );
}
