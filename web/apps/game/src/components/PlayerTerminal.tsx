import { useMe } from '../api/hooks';

export function PlayerTerminal() {
  const me = useMe();

  return (
    <div className="panel flex flex-col rounded-none p-2 gap-2 border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,255,255,0.1)] relative">
      <div className="flex justify-between items-center border-b border-neon-green/20 pb-1">
        <h2 className="text-sm font-bold text-neon-green tracking-widest">[ PLAYER TERMINAL ]</h2>
        <span className="text-[9px] text-neon-cyan animate-pulse">SYNCED</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Futuristic Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
        
        {/* Neo Portrait */}
        <div className="relative w-24 h-24 mb-2">
          {/* Hologram rings */}
          <div className="absolute inset-[-10px] rounded-full border border-neon-cyan/30 animate-[spin_4s_linear_infinite]"></div>
          <div className="absolute inset-[-5px] rounded-full border border-dashed border-neon-green/50 animate-[spin_6s_linear_infinite_reverse]"></div>
          
          <div className="w-full h-full rounded-full border-2 border-neon-cyan bg-black overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.6)] relative z-10 flex items-center justify-center">
            {/* Cyberpunk Neo Silhouette SVG */}
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-neon-cyan drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" fill="currentColor">
              <path d="M50,10 C35,10 25,25 25,40 C25,50 30,55 35,60 C32,65 20,70 10,90 L90,90 C80,70 68,65 65,60 C70,55 75,50 75,40 C75,25 65,10 50,10 Z M40,35 h20 v5 h-20 z" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-neon-green/20 to-transparent"></div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-4 z-10">
          <div className="flex flex-col items-center bg-black/60 border border-neon-cyan/20 p-1 rounded">
            <span className="text-[8px] text-neon-cyan/70 uppercase">Identity</span>
            <span className="text-xs font-bold text-white">{me.data?.username ?? 'NEO'}</span>
          </div>
          <div className="flex flex-col items-center bg-black/60 border border-neon-cyan/20 p-1 rounded">
            <span className="text-[8px] text-neon-cyan/70 uppercase">Level</span>
            <span className="text-xs font-bold text-neon-magenta">Lv. {me.data?.level ?? 1}</span>
          </div>
          <div className="flex flex-col items-center bg-black/60 border border-neon-cyan/20 p-1 rounded">
            <span className="text-[8px] text-neon-cyan/70 uppercase">XP Core</span>
            <span className="text-xs font-bold text-neon-green">{me.data?.xp ?? 0}</span>
          </div>
          <div className="flex flex-col items-center bg-black/60 border border-neon-cyan/20 p-1 rounded">
            <span className="text-[8px] text-neon-cyan/70 uppercase">Status</span>
            <span className="text-xs font-bold text-amber-400">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
