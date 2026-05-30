import type { BountyOut } from '@glitch/contracts';
import { useTranslation } from 'react-i18next';
import { useBounties, useClaimBounty } from '../api/hooks';

function progressPct(b: BountyOut): number {
  const target = Number(b.spec_json?.target ?? 1) || 1;
  return Math.min(100, (b.progress / target) * 100);
}

export function BountyPanel() {
  const { t } = useTranslation();
  const { data } = useBounties();
  const claim = useClaimBounty();

  return (
    <div className="panel flex flex-col p-0 flex-1">
      <div className="bg-[#fcfaf8] border-b border-zen-border p-3">
        <h2 className="text-sm font-bold text-zen-text tracking-wide flex items-center gap-2">
          <div className="w-1.5 h-4 bg-zen-accent rounded-sm"></div>
          {t('bounty.title')}
        </h2>
      </div>
      <div className="space-y-3 p-3 flex-1 overflow-y-auto custom-scrollbar bg-white">
        {data?.map((b) => (
          <div key={b.id} className="rounded-lg border border-zen-border bg-[#fdfbf7] p-3 shadow-sm">
            <div className="mb-2 text-xs text-zen-text font-medium">
              {b.spec_json?.code ? t(`bounty.tasks.${b.spec_json.code}`, String(b.spec_json?.description ?? 'Directive')) : String(b.spec_json?.description ?? 'Directive')}
            </div>
            <div className="mb-3 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-zen-accent transition-all duration-500 ease-out"
                style={{ width: `${progressPct(b)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zen-light font-mono">
                {b.progress}/{String(b.spec_json?.target ?? 1)}
              </span>
              {b.claimed ? (
                <span className="text-[10px] text-zen-accent font-bold">{t('bounty.claimed')}</span>
              ) : (
                <button
                  disabled={!b.completed || claim.isPending}
                  onClick={() => claim.mutate(b.id)}
                  className="rounded-md bg-[#f4f6f4] px-3 py-1 text-[10px] font-bold text-zen-accent border border-[#e1e7e3] enabled:hover:bg-[#ebf0ec] disabled:opacity-50 transition-colors"
                >
                  {t('bounty.claim')}
                </button>
              )}
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="text-xs text-zen-light text-center py-4">{t('bounty.empty')}</div>
        )}
      </div>
    </div>
  );
}
