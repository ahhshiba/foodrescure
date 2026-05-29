import { useNodes } from '../api';

function healthColor(h: number): string {
  if (h < 20) return 'bg-neon-magenta';
  if (h < 50) return 'bg-neon-amber';
  return 'bg-neon-green';
}

export function NodeTopology() {
  const { data: nodes = [] } = useNodes();
  const online = nodes.filter((n) => n.status === 'online').length;

  return (
    <div className="panel flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="panel-title">Network Topology</span>
        <span className="text-xs text-neon-cyan/70">
          {online}/{nodes.length} online
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {nodes.map((n) => (
          <div key={n.id} className="rounded border border-neon-cyan/15 bg-black/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neon-cyan">{n.name}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  n.status === 'online' ? 'bg-neon-green' : 'bg-neon-magenta'
                }`}
              />
            </div>
            <div className="mt-1 text-[10px] text-neon-cyan/50">{n.location}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded bg-black/60">
                <div
                  className={`h-full rounded ${healthColor(n.health_avg)}`}
                  style={{ width: `${Math.max(3, n.health_avg)}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-neon-cyan/70">
                {n.health_avg.toFixed(0)}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-neon-magenta/80">entropy {n.entropy.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
