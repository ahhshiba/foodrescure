import { useEffect, useMemo } from 'react';
import { useGame } from '../store/game';

function Swarm() {
  // Nanos converging to the centre from random offsets.
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 180;
        return { sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist, delay: Math.random() * 0.3 };
      }),
    [],
  );
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          className="nano"
          style={
            {
              '--sx': `${d.sx}px`,
              '--sy': `${d.sy}px`,
              animationDelay: `${d.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

export function UnlockOverlay() {
  const unlockFx = useGame((s) => s.unlockFx);
  const creditFx = useGame((s) => s.creditFx);
  const clearUnlock = useGame((s) => s.clearUnlock);
  const clearCredit = useGame((s) => s.clearCredit);

  useEffect(() => {
    if (!unlockFx) return;
    const t = setTimeout(clearUnlock, 1700);
    return () => clearTimeout(t);
  }, [unlockFx, clearUnlock]);

  useEffect(() => {
    if (!creditFx) return;
    const t = setTimeout(clearCredit, 1700);
    return () => clearTimeout(t);
  }, [creditFx, clearCredit]);

  if (!unlockFx && !creditFx) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {unlockFx && (
        <div className="relative">
          <div className="pulse-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2" />
          <Swarm />
          <div className="glitch-text text-center text-sm font-bold uppercase tracking-[0.3em] text-neon-blue">
            nanos deployed // {unlockFx.nodeId}
          </div>
        </div>
      )}
      {creditFx && (
        <div className="credit-float absolute" style={{ top: '40%' }}>
          <div className="text-center text-2xl font-bold text-neon-green drop-shadow-[0_0_8px_#39ff14]">
            +{Math.round(creditFx.protein)}P +{Math.round(creditFx.carbs)}C +
            {Math.round(creditFx.lipids)}L
          </div>
          <div className="text-center text-sm text-neon-cyan">+{creditFx.xp} XP</div>
        </div>
      )}
    </div>
  );
}
