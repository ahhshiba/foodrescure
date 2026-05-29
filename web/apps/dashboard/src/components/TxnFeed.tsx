import { useTransactions } from '../api';

export function TxnFeed() {
  const { data = [] } = useTransactions();
  return (
    <div className="panel flex flex-col p-4">
      <span className="panel-title mb-2">Live Salvage Feed</span>
      <div className="flex-1 space-y-1 overflow-y-auto text-[11px]">
        {data.map((t) => {
          const item = t.items_json?.[0] as { class?: string; count?: number } | undefined;
          const gains = t.gains_json as { protein?: number; carbs?: number; lipids?: number };
          return (
            <div key={t.txn_id} className="flex justify-between border-b border-neon-cyan/10 py-1">
              <span className="text-neon-green">
                {item?.class ?? '?'} ×{item?.count ?? 1}
                <span className="text-neon-cyan/50"> @ {t.node_id}</span>
              </span>
              <span className="text-neon-cyan/70">
                +{Math.round(gains?.protein ?? 0)}P/{Math.round(gains?.carbs ?? 0)}C/
                {Math.round(gains?.lipids ?? 0)}L · {t.xp_awarded}xp
              </span>
            </div>
          );
        })}
        {data.length === 0 && <div className="text-neon-cyan/40">no salvage logged yet…</div>}
      </div>
    </div>
  );
}
