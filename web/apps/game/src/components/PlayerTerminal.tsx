import { useMe } from '../api/hooks';

export function PlayerTerminal() {
  const me = useMe();

  return (
    <div className="panel flex flex-col p-4 gap-4 bg-white border border-zen-border rounded-xl shadow-sm">
      <div className="flex justify-between items-center border-b border-zen-border pb-2">
        <h2 className="text-sm font-bold text-zen-text tracking-wide">Player Profile</h2>
        <span className="text-[10px] text-zen-accent font-medium">Synced</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Minimal Portrait */}
        <div className="relative w-24 h-24 mb-4">
          <div className="w-full h-full rounded-full border-2 border-zen-border bg-[#fdfbf7] flex items-center justify-center">
            {/* Minimal Avatar SVG */}
            <svg viewBox="0 0 100 100" className="w-12 h-12 text-zen-light" fill="currentColor">
              <path d="M50 55c-15 0-25-10-25-25s10-25 25-25 25 10 25 25-10 25-25 25zm0 5c18 0 35 15 35 40H15c0-25 17-40 35-40z" />
            </svg>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="flex flex-col items-center bg-[#fdfbf7] border border-zen-border p-2 rounded-lg">
            <span className="text-[10px] text-zen-light mb-0.5">Identity</span>
            <span className="text-sm font-bold text-zen-text">{me.data?.username ?? 'USER'}</span>
          </div>
          <div className="flex flex-col items-center bg-[#fdfbf7] border border-zen-border p-2 rounded-lg">
            <span className="text-[10px] text-zen-light mb-0.5">Level</span>
            <span className="text-sm font-bold text-zen-accent">Lv. {me.data?.level ?? 1}</span>
          </div>
          <div className="flex flex-col items-center bg-[#fdfbf7] border border-zen-border p-2 rounded-lg">
            <span className="text-[10px] text-zen-light mb-0.5">Experience</span>
            <span className="text-sm font-bold text-zen-primary">{me.data?.xp ?? 0}</span>
          </div>
          <div className="flex flex-col items-center bg-[#fdfbf7] border border-zen-border p-2 rounded-lg">
            <span className="text-[10px] text-zen-light mb-0.5">Status</span>
            <span className="text-sm font-bold text-amber-500">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
