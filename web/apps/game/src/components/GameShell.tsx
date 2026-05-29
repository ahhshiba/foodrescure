import { useEffect } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { useGame } from '../store/game';
import { BountyPanel } from './BountyPanel';
import { DropOffButton } from './DropOffButton';
import { EventFeed } from './EventFeed';
import { Hud } from './Hud';
import { MapView } from './MapView';
import { NodePanel } from './NodePanel';
import { PurityPrompt } from './PurityPrompt';
import { UnlockOverlay } from './UnlockOverlay';
import { Workbench } from './Workbench';

export function GameShell() {
  useGameSocket();
  const glitch = useGame((s) => s.glitch);

  // Drive the global CRT/glitch intensity from live entropy.
  useEffect(() => {
    document.documentElement.style.setProperty('--glitch', String(glitch));
  }, [glitch]);

  return (
    <div className="crt flex h-full flex-col gap-2 p-2">
      <Hud />
      <main className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        <section className="col-span-3 min-h-0">
          <Workbench />
        </section>
        <section className="col-span-6 grid min-h-0 grid-rows-[1.6fr_1fr] gap-2">
          <MapView />
          <NodePanel />
        </section>
        <section className="col-span-3 grid min-h-0 grid-rows-2 gap-2">
          <BountyPanel />
          <EventFeed />
        </section>
      </main>
      <UnlockOverlay />
      <PurityPrompt />
      <DropOffButton />
    </div>
  );
}
