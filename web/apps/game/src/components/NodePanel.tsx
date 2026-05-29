import type { NodeDetail } from '@glitch/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';

function healthColor(h: number): string {
  if (h < 20) return 'bg-neon-magenta';
  if (h < 50) return 'bg-amber-400';
  return 'bg-neon-green';
}

export function NodePanel() {
  const token = useAuth((s) => s.token);
  const selectedNodeId = useGame((s) => s.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);

  const { data, isLoading } = useQuery({
    queryKey: ['node', selectedNodeId],
    queryFn: () => api<NodeDetail>(`/nodes/${selectedNodeId}`, { token }),
    enabled: !!selectedNodeId && !!token,
    refetchInterval: 8_000,
  });

  if (!selectedNodeId) {
    return (
      <div className="panel flex h-full items-center justify-center rounded-lg p-4 text-center text-xs text-neon-cyan/60">
        Ping a node on the grid to scan its contents.
      </div>
    );
  }

  return (
    <div className="panel flex h-full flex-col rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neon-green">{data?.name ?? selectedNodeId}</h2>
        <button onClick={() => selectNode(null)} className="text-xs text-neon-magenta hover:underline">
          ✕
        </button>
      </div>
      <div className="mb-3 text-[10px] uppercase tracking-widest text-neon-cyan/70">
        {data?.location} · {data?.status ?? '...'}
      </div>

      {isLoading && <div className="text-xs text-neon-cyan/60">scanning…</div>}

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {data?.foods
          .filter((f) => !f.claimed)
          .map((f) => (
            <div key={f.id} className="rounded border border-neon-green/20 bg-black/40 p-2">
              <div className="flex justify-between text-xs">
                <span className={f.spoiled ? 'text-neon-magenta' : 'text-neon-green'}>
                  {f.food_class}
                  {f.spoiled && ' ⚠ biotoxin'}
                </span>
                <span className="text-neon-cyan/70">{f.health.toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded bg-black/60">
                <div
                  className={`h-full rounded ${healthColor(f.health)}`}
                  style={{ width: `${Math.max(2, f.health)}%` }}
                />
              </div>
            </div>
          ))}
        {data && data.foods.filter((f) => !f.claimed).length === 0 && (
          <div className="text-xs text-neon-cyan/60">No unclaimed payload. Fully salvaged.</div>
        )}
      </div>
    </div>
  );
}
