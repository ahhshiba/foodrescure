import { useEffect, useRef } from 'react';
import { useInventory, useUpgradeNanos } from '../api/hooks';

interface NanoEntity {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  color: string;
  type: string;
  carrying: boolean;
  state: 'idle' | 'moving' | 'gathering' | 'returning';
  id: number;
}

interface FoodEntity {
  x: number;
  y: number;
  color: string;
  id: number;
  gathered: boolean;
  type: string;
}

export function NanosInteractZone() {
  const inv = useInventory();
  const upgrade = useUpgradeNanos();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nanosStats = inv.data?.nanos ?? [];
  const displayNanos = nanosStats.length > 0 ? nanosStats : [
    { nanos_type: 'crab', level: 1 },
    { nanos_type: 'spider', level: 2 },
    { nanos_type: 'jellyfish', level: 1 }
  ];

  // Canvas Animation Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 200;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize Entities
    const colors: Record<string, string> = {
      crab: '#05d9e8',
      spider: '#39ff14',
      jellyfish: '#ff2a6d'
    };

    let entities: NanoEntity[] = [];
    let idCounter = 0;
    displayNanos.forEach(n => {
      // Create 3-5 of each type
      const count = 3 + n.level;
      for (let i=0; i<count; i++) {
        entities.push({
          id: idCounter++,
          type: n.nanos_type,
          color: colors[n.nanos_type] || '#fff',
          x: canvas.width / 2 + (Math.random() * 40 - 20),
          y: canvas.height - 30 + (Math.random() * 20 - 10),
          tx: canvas.width / 2,
          ty: canvas.height - 30,
          speed: 0.5 + Math.random() * 0.5 + (n.level * 0.2),
          carrying: false,
          state: 'idle'
        });
      }
    });

    let foods: FoodEntity[] = [];
    
    // Spawn food randomly
    const spawnFood = () => {
      if (foods.length < 5) {
        foods.push({
          id: Math.random(),
          x: 20 + Math.random() * (canvas.width - 40),
          y: 20 + Math.random() * (canvas.height - 80),
          color: ['#fbbf24', '#ff2a6d', '#39ff14'][Math.floor(Math.random() * 3)],
          type: ['PIZZA', 'APPLE', 'BURGER'][Math.floor(Math.random() * 3)],
          gathered: false
        });
      }
      setTimeout(spawnFood, 3000 + Math.random() * 4000);
    };
    spawnFood();

    // Render loop
    let animationId: number;
    const render = () => {
      ctx.fillStyle = '#050a0f'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid/street context
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
      }

      // Draw Base / Player Terminal link
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height - 10, 40, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BASE_LINK', canvas.width / 2, canvas.height - 5);

      // Update and Draw Foods
      foods.forEach((f) => {
        if (f.gathered) return;
        ctx.shadowBlur = 10;
        ctx.shadowColor = f.color;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px monospace';
        ctx.fillText(f.type, f.x, f.y - 8);
      });

      // Update and Draw Nanos
      entities.forEach(n => {
        // AI Logic
        if (n.state === 'idle') {
          if (Math.random() < 0.02) {
            // Wander
            n.tx = n.x + (Math.random() * 60 - 30);
            n.ty = n.y + (Math.random() * 60 - 30);
            n.tx = Math.max(10, Math.min(canvas.width - 10, n.tx));
            n.ty = Math.max(10, Math.min(canvas.height - 10, n.ty));
            n.state = 'moving';
          }
          // Look for food
          const targetFood = foods.find(f => !f.gathered);
          if (targetFood && Math.random() < 0.05) {
            n.tx = targetFood.x;
            n.ty = targetFood.y;
            n.state = 'gathering';
          }
        }

        // Movement
        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 1) {
          n.x += (dx / dist) * n.speed;
          n.y += (dy / dist) * n.speed;
        } else {
          if (n.state === 'gathering') {
            const f = foods.find(f => Math.abs(f.x - n.x) < 5 && Math.abs(f.y - n.y) < 5 && !f.gathered);
            if (f) {
              f.gathered = true;
              n.carrying = true;
              n.state = 'returning';
              n.tx = canvas.width / 2;
              n.ty = canvas.height - 10;
            } else {
              n.state = 'idle';
            }
          } else if (n.state === 'returning') {
            n.carrying = false;
            n.state = 'idle';
            // Remove gathered foods fully
            foods = foods.filter(f => !f.gathered);
          } else {
            n.state = 'idle';
          }
        }

        // Draw Nano
        ctx.shadowBlur = 8;
        ctx.shadowColor = n.color;
        ctx.fillStyle = n.color;
        ctx.fillRect(n.x - 2, n.y - 2, 4, 4);
        ctx.shadowBlur = 0;

        if (n.carrying) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(n.x, n.y - 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [displayNanos]);

  return (
    <div className="panel flex h-full flex-col rounded-none p-0 border border-neon-magenta/40 shadow-[0_0_15px_rgba(255,0,255,0.1)] relative">
      
      {/* Header */}
      <div className="bg-neon-magenta/10 border-b border-neon-magenta/40 p-2 flex justify-between items-center z-10">
        <h2 className="text-sm font-bold text-neon-magenta tracking-widest uppercase flex items-center gap-2">
          <div className="w-1.5 h-4 bg-neon-magenta"></div>
          NANOS_INTERACT_ZONE
        </h2>
        <span className="text-[9px] text-neon-cyan font-mono animate-pulse">SWARM_ACTIVE</span>
      </div>

      <div className="flex-1 relative w-full overflow-hidden flex flex-col">
        
        {/* Canvas Game Area */}
        <div className="flex-1 relative w-full border-b border-neon-cyan/20">
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full block" 
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Overlay scanlines */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px]"></div>
        </div>

        {/* Nano Status Panels Overlay */}
        <div className="h-auto max-h-[140px] bg-[#020508] p-2 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar shrink-0 z-20">
          {displayNanos.map((n) => (
            <div key={n.nanos_type} className="flex items-center justify-between border-l-2 border-neon-cyan/40 bg-black/60 pl-2 pr-1 py-1 hover:bg-neon-cyan/5 transition-colors">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    n.nanos_type === 'crab' ? 'bg-neon-cyan shadow-[0_0_5px_cyan]' :
                    n.nanos_type === 'spider' ? 'bg-neon-green shadow-[0_0_5px_lime]' :
                    'bg-neon-magenta shadow-[0_0_5px_magenta]'
                  }`}></div>
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">{n.nanos_type}_UNIT</span>
                </div>
                <span className="text-[8px] text-neon-cyan/70 font-mono mt-0.5 ml-3.5">LEVEL: {n.level} // EFFICACY: {Math.floor(100 + n.level * 15)}%</span>
              </div>
              
              <button
                onClick={() => upgrade.mutate(n.nanos_type)}
                disabled={upgrade.isPending}
                className="btn-cyber btn-cyber-cyan border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-[9px] font-bold text-amber-400 uppercase tracking-widest hover:text-black hover:bg-amber-400 transition-colors"
              >
                {upgrade.isPending ? 'UPLINK...' : '[ FEED ]'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
