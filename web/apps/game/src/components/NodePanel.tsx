import type { NodeDetail } from '@glitch/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useMe } from '../api/hooks';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';
import { useState } from 'react';

function healthColor(h: number): string {
  if (h < 20) return 'bg-neon-magenta';
  if (h < 50) return 'bg-amber-400';
  return 'bg-neon-green';
}

function healthText(h: number): string {
  if (h < 20) return 'text-neon-magenta';
  if (h < 50) return 'text-amber-400';
  return 'text-neon-green';
}

export function NodePanel() {
  const { i18n } = useTranslation();
  const token = useAuth((s) => s.token);
  const selectedNodeId = useGame((s) => s.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);

  const queryClient = useQueryClient();
  const me = useMe();
  const [activeTab, setActiveTab] = useState<'inventory' | 'hardware'>('hardware');

  const { data, isLoading } = useQuery({
    queryKey: ['node', selectedNodeId],
    queryFn: () => api<NodeDetail>(`/nodes/${selectedNodeId}`, { token }),
    enabled: !!selectedNodeId && !!token,
    refetchInterval: 8_000,
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      api<{ status: string; message: string }>(`/nodes/${selectedNodeId}/reserve`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', selectedNodeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['my_reservations'] });
    },
    onError: (err: any) => {
      alert(err.message || '預約失敗，請稍後再試。');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api<{ status: string; message: string }>(`/nodes/${selectedNodeId}/cancel_reservation`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', selectedNodeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['my_reservations'] });
    },
    onError: (err: any) => {
      alert(err.message || '取消失敗，請稍後再試。');
    },
  });

  if (!selectedNodeId) {
    return (
      <div className="panel flex h-full items-center justify-center rounded-none border-t-2 border-neon-cyan/50 p-4 text-center text-xs text-neon-cyan/60">
        [ AWAITING NODE SELECTION... ]
      </div>
    );
  }

  const activeReservations = data?.foods.filter((f) => !f.claimed) ?? [];
  const myUserId = me.data?.id;

  return (
    <div className="panel flex flex-col rounded-none border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,255,255,0.1)] relative">
      {/* Hardware Header */}
      <div className="flex items-center justify-between border-b border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></div>
          <h2 className="text-sm font-bold text-neon-cyan tracking-widest uppercase">
            TARGET // {data?.name ?? selectedNodeId}
          </h2>
        </div>
        <button onClick={() => selectNode(null)} className="text-neon-cyan hover:text-white font-mono text-sm leading-none p-1">
          [X]
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neon-cyan/20">
        <button 
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 text-xs py-1.5 font-bold tracking-widest ${activeTab === 'hardware' ? 'bg-neon-cyan/20 text-neon-cyan border-b-2 border-neon-cyan' : 'text-neon-cyan/50 hover:text-neon-cyan/80'}`}
        >
          HARDWARE_CTX
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 text-xs py-1.5 font-bold tracking-widest ${activeTab === 'inventory' ? 'bg-neon-cyan/20 text-neon-cyan border-b-2 border-neon-cyan' : 'text-neon-cyan/50 hover:text-neon-cyan/80'}`}
        >
          INVENTORY_DB
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {isLoading && <div className="text-xs text-neon-cyan/60 font-mono data-matrix mb-2">SCANNING</div>}

        {activeTab === 'hardware' && (
          <div className="space-y-3">
            {/* Real-time Status */}
            <div className="flex justify-between items-end border-b border-neon-cyan/20 pb-1">
              <span className="text-[10px] text-neon-cyan/70 uppercase font-mono tracking-widest">
                LOC: {data?.location}
              </span>
              <span className={`text-[10px] font-bold ${data?.status === 'online' ? 'text-neon-green' : 'text-neon-magenta animate-pulse'}`}>
                SYS: {data?.status?.toUpperCase() ?? 'OFFLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Camera Placeholder */}
              <div className="relative aspect-video bg-[#020508] border border-neon-cyan/40 flex flex-col shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                <div className="absolute top-1 left-1 flex items-center gap-1 z-10">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></div>
                  <span className="text-[7px] text-white/80 font-mono bg-black/50 px-0.5">CAM_01</span>
                </div>
                {/* SVG Camera Outline placeholder */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                   <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_2px] z-10"></div>
                   <svg viewBox="0 0 100 100" className="w-12 h-12 text-neon-cyan/30" fill="currentColor">
                      <rect x="20" y="20" width="60" height="70" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="45" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="45" r="5" />
                      <line x1="25" y1="80" x2="75" y2="80" stroke="currentColor" strokeWidth="1" />
                   </svg>
                </div>
                <div className="h-4 bg-neon-cyan/10 border-t border-neon-cyan/30 flex justify-between items-center px-1">
                   <span className="text-[6px] text-neon-cyan font-mono">FR_001_LOCKER</span>
                   <span className="text-[6px] text-neon-cyan font-mono data-matrix">SYS_OK</span>
                </div>
              </div>

              {/* Ultrasonic Graph */}
              <div className="relative aspect-video bg-[#020508] border border-neon-cyan/40 flex flex-col p-1 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[7px] text-amber-400 font-mono tracking-widest">SONAR_DIST</span>
                   <span className="text-[7px] text-amber-400 font-mono animate-pulse">LIVE</span>
                 </div>
                 <div className="flex-1 flex items-end gap-[1px] opacity-80 overflow-hidden">
                    {/* Animated bars */}
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="flex-1 bg-amber-400/80 transition-all duration-300" style={{ 
                        height: `${Math.random() * 60 + 20}%`,
                        animation: `matrix_change ${1 + Math.random()}s infinite steps(4)`
                      }}></div>
                    ))}
                 </div>
                 <div className="mt-1 flex justify-between">
                   <span className="text-[6px] text-neon-cyan/50">0ms</span>
                   <span className="text-[6px] text-neon-cyan/50">-100ms</span>
                 </div>
              </div>
            </div>

            {/* RFID scanner feed */}
            <div className="border border-neon-cyan/30 bg-black/40 p-1.5 mt-2 flex items-center justify-between">
               <span className="text-[9px] text-neon-cyan/70 font-mono">UID_SCANNER:</span>
               <span className="text-[10px] text-neon-yellow font-mono font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,255,0,0.5)]">
                 {data?.status === 'online' ? '[ STANDBY_MODE ]' : '[ OFFLINE ]'}
               </span>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-2">
            {activeReservations.length === 0 ? (
              <div className="text-[10px] text-neon-cyan/60 font-mono text-center py-4 border border-dashed border-neon-cyan/30">
                NO RESOURCES DETECTED
              </div>
            ) : (
              activeReservations.map((f) => {
                const isMyReservation = f.reserved && f.reserved_by === myUserId;
                const isOtherReservation = f.reserved && f.reserved_by !== myUserId;

                return (
                  <div key={f.id} className="relative p-2 border border-neon-cyan/30 bg-black/60 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan/50 group-hover:bg-neon-cyan transition-colors"></div>
                    
                    <div className="pl-2 flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[11px] font-bold tracking-widest ${healthText(f.health)}`}>
                          {i18n.language === 'zh-TW' && f.display_name_zh ? f.display_name_zh : f.food_class}
                          {f.spoiled && ` [⚠ HAZARD]`}
                        </span>
                        <span className="text-[8px] text-white/50 font-mono">ID: {f.id}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${healthText(f.health)} drop-shadow-[0_0_2px_currentColor]`}>
                        HP: {f.health.toFixed(0)}%
                      </span>
                    </div>

                    <div className="pl-2 mt-1.5 h-1 w-full bg-[#050a0f] border border-neon-cyan/20">
                      <div
                        className={`h-full ${healthColor(f.health)} shadow-[0_0_5px_currentColor]`}
                        style={{ width: `${Math.max(2, f.health)}%` }}
                      />
                    </div>

                    <div className="pl-2 mt-2 flex items-center justify-between">
                      {isMyReservation ? (
                        <>
                          <span className="text-[9px] text-amber-400 font-bold animate-pulse tracking-widest border border-amber-400/30 px-1">
                            LOCKED_TO_YOU
                          </span>
                          <button
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate()}
                            className="btn-cyber btn-cyber-red border border-red-500 bg-red-950/30 px-3 py-0.5 text-[9px] font-bold text-red-400"
                          >
                            {cancelMutation.isPending ? 'ABORTING...' : '[ ABORT ]'}
                          </button>
                        </>
                      ) : isOtherReservation ? (
                        <span className="text-[9px] text-neon-magenta/60 italic tracking-widest">
                          ACCESS_DENIED // RESERVED
                        </span>
                      ) : (
                        <>
                          <span className="text-[8px] text-neon-cyan/60 tracking-widest">
                            STATUS: UNCLAIMED
                          </span>
                          <button
                            disabled={reserveMutation.isPending}
                            onClick={() => reserveMutation.mutate()}
                            className="btn-cyber btn-cyber-cyan border border-neon-green/60 px-4 py-0.5 text-[9px] font-bold text-neon-green hover:text-black hover:bg-neon-green"
                          >
                            {reserveMutation.isPending ? 'LINKING...' : '[ RESERVE ]'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
