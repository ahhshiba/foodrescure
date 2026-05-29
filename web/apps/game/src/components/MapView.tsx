import type { NodeOut } from '@glitch/contracts';
import { useState } from 'react';
import { useNodes } from '../api/hooks';
import { playPing } from '../lib/audio';
import { useGame } from '../store/game';

interface Pos {
  left: number;
  top: number;
}

// Normalize lat/lng into the 8%..92% box; fall back to a scatter by index.
function positions(nodes: NodeOut[]): Record<string, Pos> {
  const withGeo = nodes.filter((n) => n.lat != null && n.lng != null);
  const out: Record<string, Pos> = {};
  if (withGeo.length >= 2) {
    const lats = withGeo.map((n) => n.lat as number);
    const lngs = withGeo.map((n) => n.lng as number);
    const [minLa, maxLa] = [Math.min(...lats), Math.max(...lats)];
    const [minLn, maxLn] = [Math.min(...lngs), Math.max(...lngs)];
    const span = (v: number, lo: number, hi: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
    nodes.forEach((n, i) => {
      if (n.lat != null && n.lng != null) {
        out[n.id] = {
          left: 8 + span(n.lng, minLn, maxLn) * 84,
          top: 8 + (1 - span(n.lat, minLa, maxLa)) * 84,
        };
      } else {
        out[n.id] = { left: 15 + (i % 4) * 22, top: 20 + Math.floor(i / 4) * 25 };
      }
    });
  } else {
    nodes.forEach((n, i) => {
      out[n.id] = { left: 15 + (i % 4) * 22, top: 20 + Math.floor(i / 4) * 25 };
    });
  }
  return out;
}

export function MapView() {
  const { data: nodes = [] } = useNodes();
  const selectNode = useGame((s) => s.selectNode);
  const nodeEntropies = useGame((s) => s.nodeEntropies);
  const pos = positions(nodes);
  const [pings, setPings] = useState<{ key: number; left: number; top: number }[]>([]);

  const onSelect = (node: NodeOut) => {
    selectNode(node.id);
    playPing();
    const p = pos[node.id];
    if (p) {
      const key = Date.now();
      setPings((ps) => [...ps, { key, left: p.left, top: p.top }]);
      setTimeout(() => setPings((ps) => ps.filter((x) => x.key !== key)), 900);
    }
  };

  return (
    <div className="panel relative h-full overflow-hidden rounded-lg">
      {/* grid backdrop */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(57,255,20,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute left-3 top-2 text-xs uppercase tracking-[0.3em] text-neon-cyan/70">
        CITY GRID // {nodes.length} nodes
      </div>

      {nodes.map((node) => {
        const p = pos[node.id];
        if (!p) return null;
        const online = node.status === 'online';
        const warning = node.health_avg > 0 && node.health_avg < 50;
        const ent = nodeEntropies[node.id] ?? node.entropy;
        const color = !online ? 'text-neon-magenta' : warning ? 'text-amber-400' : 'text-neon-green';
        return (
          <button
            key={node.id}
            onClick={() => onSelect(node)}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          >
            <div
              className={`mx-auto mb-1 h-4 w-4 rounded-full ${
                online ? 'bg-neon-green shadow-neon' : 'bg-neon-magenta shadow-magenta'
              } ${warning ? 'animate-pulse' : ''}`}
            />
            <div className={`text-[10px] font-bold ${color}`}>{node.name}</div>
            <div className="text-[9px] text-neon-cyan/60">
              hp {node.health_avg.toFixed(0)} · e {ent.toFixed(2)}
            </div>
          </button>
        );
      })}

      {pings.map((ping) => (
        <div
          key={ping.key}
          className="lidar pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${ping.left}%`, top: `${ping.top}%` }}
        />
      ))}
    </div>
  );
}
