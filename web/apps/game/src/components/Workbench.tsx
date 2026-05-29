import { useInventory, useUpgradeNanos } from '../api/hooks';

const NANOS_META: Record<string, { name: string; blurb: string; accent: string }> = {
  welder_spider: { name: 'Welder Spider', blurb: 'Faster unlock→salvage cycle', accent: 'text-neon-green' },
  suction_jelly: { name: 'Suction Jelly', blurb: 'Lossless biotoxin recovery', accent: 'text-neon-magenta' },
  crawler: { name: 'Heavy Crawler', blurb: 'Batch-rescue bonus', accent: 'text-neon-cyan' },
};

export function Workbench() {
  const { data } = useInventory();
  const upgrade = useUpgradeNanos();

  return (
    <div className="panel flex h-full flex-col rounded-lg p-4">
      <h2 className="mb-3 text-sm font-bold text-neon-green">MICRO-FOUNDRY // nanos</h2>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {data?.nanos.map((n) => {
          const meta = NANOS_META[n.nanos_type] ?? {
            name: n.nanos_type,
            blurb: '',
            accent: 'text-neon-green',
          };
          return (
            <div key={n.nanos_type} className="rounded border border-neon-green/20 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${meta.accent}`}>{meta.name}</span>
                <span className="text-[10px] text-neon-cyan/70">LVL {n.level}</span>
              </div>
              <div className="mb-2 text-[10px] text-neon-cyan/60">{meta.blurb}</div>
              <button
                onClick={() => upgrade.mutate(n.nanos_type)}
                disabled={upgrade.isPending}
                className="w-full rounded bg-neon-green/15 py-1 text-[11px] font-bold text-neon-green ring-1 ring-neon-green/50 hover:bg-neon-green/25 disabled:opacity-40"
              >
                UPGRADE
              </button>
            </div>
          );
        })}
        {!data && <div className="text-xs text-neon-cyan/60">loading rig…</div>}
      </div>
      {upgrade.isError && (
        <div className="mt-2 text-[10px] text-neon-magenta">⚠ {(upgrade.error as Error).message}</div>
      )}
      {upgrade.isSuccess && (
        <div className="mt-2 text-[10px] text-neon-green">
          ↑ {upgrade.data.nanos_type} → LVL {upgrade.data.new_level}
        </div>
      )}
    </div>
  );
}
