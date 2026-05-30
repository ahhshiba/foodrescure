import type { NodeDetail } from '@glitch/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useMe } from '../api/hooks';
import { useAuth } from '../store/auth';
import { useGame } from '../store/game';
import { useState, useEffect } from 'react';

function HealthCountdown({ health }: { health: number }) {
  // Map 100 health to 24 hours (24 * 3600 seconds)
  const initialSeconds = Math.max(0, Math.floor((health / 100) * 24 * 3600));
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(Math.max(0, Math.floor((health / 100) * 24 * 3600)));
  }, [health]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return <span className={`text-[10px] ${healthText(health)} font-mono font-medium`}>T-{hrs}:{mins}:{secs}</span>;
}

function healthColor(h: number): string {
  if (h < 20) return 'bg-zen-alert';
  if (h < 50) return 'bg-amber-400';
  return 'bg-zen-accent';
}

function healthText(h: number): string {
  if (h < 20) return 'text-zen-alert';
  if (h < 50) return 'text-amber-500';
  return 'text-zen-accent';
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
      <div className="panel flex h-full items-center justify-center border-t-4 border-zen-border p-4 text-center text-xs text-zen-light">
        Please select a node.
      </div>
    );
  }

  const activeReservations = data?.foods.filter((f) => !f.claimed) ?? [];
  const myUserId = me.data?.id;

  return (
    <div className="panel flex flex-col relative bg-white">
      {/* Hardware Header */}
      <div className="flex items-center justify-between border-b border-zen-border bg-[#fcfaf8] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-zen-accent animate-pulse"></div>
          <h2 className="text-sm font-bold text-zen-text tracking-wide">
            TARGET: {data?.name ?? selectedNodeId}
          </h2>
        </div>
        <button onClick={() => selectNode(null)} className="text-zen-light hover:text-zen-text text-lg leading-none">
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zen-border bg-[#fcfaf8]">
        <button 
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 text-xs py-2 font-medium tracking-wide transition-colors ${activeTab === 'hardware' ? 'bg-white text-zen-text border-b-2 border-zen-accent' : 'text-zen-light hover:text-zen-text'}`}
        >
          HARDWARE
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 text-xs py-2 font-medium tracking-wide transition-colors ${activeTab === 'inventory' ? 'bg-white text-zen-text border-b-2 border-zen-accent' : 'text-zen-light hover:text-zen-text'}`}
        >
          INVENTORY
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {isLoading && <div className="text-xs text-zen-light mb-3">Loading...</div>}

        {activeTab === 'hardware' && (
          <div className="space-y-4">
            {/* Real-time Status */}
            <div className="flex justify-between items-end border-b border-zen-border pb-2">
              <span className="text-[11px] text-zen-light uppercase tracking-wide">
                Location: {data?.location}
              </span>
              <span className={`text-[11px] font-bold ${data?.status === 'online' ? 'text-zen-accent' : 'text-zen-alert'}`}>
                Status: {data?.status?.toUpperCase() ?? 'OFFLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Camera Placeholder */}
              <div className="relative aspect-video bg-[#fdfbf7] border border-zen-border rounded-lg flex flex-col shadow-sm">
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-[8px] text-zen-text bg-white/80 px-1 rounded">CAM 01</span>
                </div>
                {/* SVG Camera Outline placeholder */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden text-zen-border">
                   <svg viewBox="0 0 100 100" className="w-10 h-10" fill="currentColor">
                      <rect x="20" y="20" width="60" height="70" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="45" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="45" r="5" />
                   </svg>
                </div>
                <div className="h-5 bg-white border-t border-zen-border flex justify-between items-center px-2 rounded-b-lg">
                   <span className="text-[7px] text-zen-light">LOCKER FR_01</span>
                   <span className="text-[7px] text-zen-accent">OK</span>
                </div>
              </div>

              {/* Ultrasonic Graph */}
              <div className="relative aspect-video bg-[#fdfbf7] border border-zen-border rounded-lg flex flex-col p-2 shadow-sm">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[8px] text-zen-primary tracking-wide">SONAR DISTANCE</span>
                 </div>
                 <div className="flex-1 flex items-end gap-[2px] overflow-hidden">
                    {/* Animated bars */}
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="flex-1 bg-zen-primary/40 rounded-t-sm transition-all duration-700" style={{ 
                        height: `${Math.random() * 60 + 20}%`
                      }}></div>
                    ))}
                 </div>
              </div>
            </div>

            {/* RFID scanner feed */}
            <div className="border border-zen-border bg-[#f8f6f2] rounded-lg p-3 mt-2 flex items-center justify-between">
               <span className="text-xs text-zen-text">Card Reader</span>
               <span className="text-xs text-zen-primary font-bold">
                 {data?.status === 'online' ? 'Standby' : 'Offline'}
               </span>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-3">
            {activeReservations.length === 0 ? (
              <div className="text-xs text-zen-light text-center py-6 border border-dashed border-zen-border rounded-lg">
                No items detected.
              </div>
            ) : (
              activeReservations.map((f) => {
                const isMyReservation = f.reserved && f.reserved_by === myUserId;
                const isOtherReservation = f.reserved && f.reserved_by !== myUserId;

                return (
                  <div key={f.id} className="p-3 border border-zen-border rounded-lg bg-[#fdfbf7] shadow-sm">
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-bold ${healthText(f.health)}`}>
                          {i18n.language === 'zh-TW' && f.display_name_zh ? f.display_name_zh : f.food_class}
                          {f.spoiled && ` [Spoiled]`}
                        </span>
                        <span className="text-[9px] text-zen-light mt-0.5">Item ID: {String(f.id).split('-')[0]}</span>
                      </div>
                      <HealthCountdown health={f.health} />
                    </div>

                    <div className="h-1.5 w-full bg-gray-200 rounded-full mb-3 overflow-hidden">
                      <div
                        className={`h-full ${healthColor(f.health)} rounded-full`}
                        style={{ width: `${Math.max(2, f.health)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zen-border">
                      {isMyReservation ? (
                        <>
                          <span className="text-xs text-amber-500 font-bold">
                            Reserved
                          </span>
                          <button
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate()}
                            className="btn-cyber-red px-3 py-1 text-xs font-bold rounded-md"
                          >
                            {cancelMutation.isPending ? '...' : 'Cancel'}
                          </button>
                        </>
                      ) : isOtherReservation ? (
                        <span className="text-xs text-zen-alert italic">
                          Unavailable
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] text-zen-light">
                            Available
                          </span>
                          <button
                            disabled={reserveMutation.isPending}
                            onClick={() => reserveMutation.mutate()}
                            className="btn-cyber-cyan px-4 py-1 text-xs font-bold rounded-md"
                          >
                            {reserveMutation.isPending ? '...' : 'Reserve'}
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
