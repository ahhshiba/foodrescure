import type { BountyOut } from '@glitch/contracts';
import { useBounties, useClaimBounty } from '../api/hooks';

function progressPct(b: BountyOut): number {
  const target = Number(b.spec_json?.target ?? 1) || 1;
  return Math.min(100, (b.progress / target) * 100);
}

export function BountyPanel() {
  const { data } = useBounties();
  const claim = useClaimBounty();

  return (
    <div className="panel flex h-full flex-col rounded-lg p-4">
      <h2 className="mb-3 text-sm font-bold text-neon-green">DIRECTIVES // today</h2>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
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
                <span className="text-[10px] text-neon-green/70">CLAIMED ✓</span>
              ) : (
                <button
                  disabled={!b.completed || claim.isPending}
                  onClick={() => claim.mutate(b.id)}
                  className="rounded bg-neon-magenta/15 px-2 py-0.5 text-[10px] font-bold text-neon-magenta ring-1 ring-neon-magenta/50 enabled:hover:bg-neon-magenta/25 disabled:opacity-30"
                >
                  CLAIM
                </button>
              )}
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="text-xs text-neon-cyan/60">No directives posted yet.</div>
        )}
      </div>
    </div>
  );
}
