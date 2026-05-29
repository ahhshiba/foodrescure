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
    <div className="panel flex flex-col rounded-none p-0 border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,255,255,0.05)] relative flex-1">
      <div className="bg-neon-cyan/10 border-b border-neon-cyan/40 p-2">
        <h2 className="text-sm font-bold text-neon-green tracking-widest uppercase flex items-center gap-2">
          <div className="w-1.5 h-4 bg-neon-green"></div>
          {t('bounty.title')}
        </h2>
      </div>
      <div className="space-y-3 p-3 flex-1 overflow-y-auto custom-scrollbar">
        {data?.map((b) => (
          <div key={b.id} className="rounded border border-neon-green/20 bg-black/40 p-3">
            <div className="mb-1 text-xs text-neon-cyan">{String(b.spec_json?.description ?? 'Directive')}</div>
            <div className="mb-2 h-1.5 w-full rounded bg-black/60">
              <div
                className="h-full rounded bg-neon-cyan"
                style={{ width: `${progressPct(b)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neon-cyan/60">
                {b.progress}/{String(b.spec_json?.target ?? 1)}
              </span>
              {b.claimed ? (
                <span className="text-[10px] text-neon-green/70">{t('bounty.claimed')}</span>
              ) : (
                <button
                  disabled={!b.completed || claim.isPending}
                  onClick={() => claim.mutate(b.id)}
                  className="rounded bg-neon-magenta/15 px-2 py-0.5 text-[10px] font-bold text-neon-magenta ring-1 ring-neon-magenta/50 enabled:hover:bg-neon-magenta/25 disabled:opacity-30"
                >
                  {t('bounty.claim')}
                </button>
              )}
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="text-xs text-neon-cyan/60">{t('bounty.empty')}</div>
        )}
      </div>
    </div>
  );
}
