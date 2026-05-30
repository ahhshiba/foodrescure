import { useEffect, useState } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { useGame } from '../store/game';
import { BountyPanel } from './BountyPanel';
import { DropOffButton } from './DropOffButton';

import { Hud } from './Hud';
import { MapView } from './MapView';
import { NodePanel } from './NodePanel';
import { PurityPrompt } from './PurityPrompt';
import { UnlockOverlay } from './UnlockOverlay';
import { ReservationManager } from './ReservationManager';
import { PlayerTerminal } from './PlayerTerminal';
import { NanosInteractZone } from './NanosInteractZone';

export function GameShell() {
  useGameSocket();
  const glitch = useGame((s) => s.glitch);
  const [activeTab, setActiveTab] = useState<'map' | 'workbench' | 'tasks'>('map');

  // Drive the global CRT/glitch intensity from live entropy.
  useEffect(() => {
    document.documentElement.style.setProperty('--glitch', String(glitch));
  }, [glitch]);

  return (
    <div className="flex flex-col gap-4 p-4 min-h-screen">
      <Hud />

      {/* Desktop view (visible >= md) */}
      {/* We removed flex-1 and h-screen constraints so the grid expands and the page scrolls naturally at 100% zoom */}
      <main className="hidden md:grid grid-cols-12 gap-4 pb-10">
        
        {/* Left Column */}
        <section className="col-span-3 flex flex-col gap-4">
          <BountyPanel />
          <ReservationManager />
        </section>
        
        {/* Center Column */}
        <section className="col-span-6 flex flex-col gap-4">
          {/* Force MapView to have a fixed height so Leaflet renders properly and doesn't collapse */}
          <div className="h-[450px] shadow-sm border border-zen-border rounded-xl overflow-hidden">
            <MapView />
          </div>
          <NodePanel />
        </section>
        
        {/* Right Column */}
        <section className="col-span-3 flex flex-col gap-4">
          <PlayerTerminal />
          {/* Nanos Interact Zone given explicit height for canvas game */}
          <div className="h-[450px]">
             <NanosInteractZone />
          </div>
        </section>
        
      </main>

      {/* Mobile view (visible < md) */}
      <main className="flex md:hidden flex-1 flex-col min-h-0 gap-2 overflow-hidden pb-16">
        {activeTab === 'map' && (
          <div className="flex flex-1 flex-col min-h-0 gap-2">
            <div className="h-[350px] shrink-0">
              <MapView />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <NodePanel />
            </div>
          </div>
        )}

        {activeTab === 'workbench' && (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
            <PlayerTerminal />
            <div className="h-[400px]">
               <NanosInteractZone />
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
            <BountyPanel />
            <ReservationManager />
          </div>
        )}

        {/* Mobile bottom tabs */}
        <nav className="panel fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around text-xs font-bold uppercase tracking-wide bg-white border-t border-zen-border">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
              activeTab === 'map'
                ? 'text-zen-primary border-t-2 border-zen-primary bg-[#f4f6f4]'
                : 'text-zen-light hover:text-zen-text'
            }`}
          >
            <span className="text-base">🗺️</span>
            <span>MAP</span>
          </button>
          <div className="w-[1px] h-6 bg-zen-border" />
          <button
            onClick={() => setActiveTab('workbench')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
              activeTab === 'workbench'
                ? 'text-zen-accent border-t-2 border-zen-accent bg-[#f8f6f2]'
                : 'text-zen-light hover:text-zen-text'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>SYSTEM</span>
          </button>
          <div className="w-[1px] h-6 bg-zen-border" />
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
              activeTab === 'tasks'
                ? 'text-zen-text border-t-2 border-zen-text bg-[#f8f6f2]'
                : 'text-zen-light hover:text-zen-text'
            }`}
          >
            <span className="text-base">📋</span>
            <span>TASKS</span>
          </button>
        </nav>
      </main>

      <UnlockOverlay />
      <PurityPrompt />
      <DropOffButton />
    </div>
  );
}
