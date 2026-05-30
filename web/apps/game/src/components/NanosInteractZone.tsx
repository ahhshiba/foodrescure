import { useEffect, useRef } from 'react';
import { useInventory, useUpgradeNanos } from '../api/hooks';
import { useTalkingTom } from '../hooks/useTalkingTom';
import { R3D } from './R3D';

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
  const { isRecording, isPlaying, startRecording, stopRecording } = useTalkingTom();

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
      crab: '#d9a05b',     // warm muted orange
      spider: '#7fb069',   // sage green
      jellyfish: '#e68a8a' // soft rose
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
      ctx.fillStyle = '#fdfbf7'; // Zen background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid/street context
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
      }

      // Draw Base / Player Terminal link
      ctx.fillStyle = 'rgba(127, 176, 105, 0.1)';
      ctx.strokeStyle = 'rgba(127, 176, 105, 0.3)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height - 10, 40, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7fb069';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BASE', canvas.width / 2, canvas.height - 5);

      // Update and Draw Foods
      foods.forEach((f) => {
        if (f.gathered) return;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#4a4a4a';
        ctx.font = '8px sans-serif';
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
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fill();
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
    <div className="panel flex h-full flex-col p-0 border border-zen-border shadow-sm relative bg-white overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#fcfaf8] border-b border-zen-border p-3 flex justify-between items-center z-10">
        <h2 className="text-sm font-bold text-zen-text tracking-wide flex items-center gap-2">
          <div className="w-1.5 h-4 bg-zen-primary rounded-sm"></div>
          Assistants Activity
        </h2>
        <span className="text-[10px] text-zen-accent font-medium">Active</span>
      </div>

      <div className="flex-1 relative w-full overflow-hidden flex flex-col">
        
        {/* Canvas Game Area & 3D Tom Overlay */}
        <div className="flex-1 relative w-full border-b border-zen-border bg-[#fdfbf7]">
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full block opacity-40"
          />
          <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
             <R3D isPlaying={isPlaying} />
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-auto">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`px-6 py-2 rounded-full font-bold text-sm shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 ${isRecording ? 'bg-[#c98a87] text-white animate-pulse' : 'bg-zen-primary text-white'}`}
            >
              {isRecording ? '🎤 Listening...' : '🎤 Hold to Talk'}
            </button>
          </div>
        </div>

        {/* Nano Status Panels Overlay */}
        <div className="h-auto max-h-[140px] bg-white p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar shrink-0 z-20">
          {displayNanos.map((n) => (
            <div key={n.nanos_type} className="flex items-center justify-between border border-zen-border rounded-lg bg-[#fcfaf8] p-2 hover:bg-[#f8f6f2] transition-colors">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    n.nanos_type === 'crab' ? 'bg-[#d9a05b]' :
                    n.nanos_type === 'spider' ? 'bg-[#7fb069]' :
                    'bg-[#e68a8a]'
                  }`}></div>
                  <span className="text-xs font-bold text-zen-text capitalize">{n.nanos_type}</span>
                </div>
                <span className="text-[9px] text-zen-light mt-1 ml-4">Lv: {n.level} | Efficacy: {Math.floor(100 + n.level * 15)}%</span>
              </div>
              
              <button
                onClick={() => upgrade.mutate(n.nanos_type)}
                disabled={upgrade.isPending}
                className="px-3 py-1.5 text-xs font-bold text-zen-primary bg-[#f4f6f4] border border-[#e1e7e3] rounded-md hover:bg-[#ebf0ec] transition-colors"
              >
                {upgrade.isPending ? '...' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
