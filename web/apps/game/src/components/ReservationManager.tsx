import { useTranslation } from 'react-i18next';
import { useCancelReservation, useMyReservations } from '../api/hooks';
import { useGame } from '../store/game';
import { EventFeed } from './EventFeed';
import { useMe } from '../api/hooks';

export function ReservationManager() {
  const { i18n } = useTranslation();
  const selectNode = useGame((s) => s.selectNode);
  const { data: reservations, isLoading } = useMyReservations();
  const cancelMutation = useCancelReservation();
  const me = useMe();

  const bookedList = reservations || [];
  
  // Mock cancelled items for UI demonstration of the prompt.
  // In a real app we'd fetch actual history.
  const cancelList = [
    { id: 'c1', node_id: 'Locker_01', food_class: 'Apple', time: '10:42' },
    { id: 'c2', node_id: 'Cafeteria_North', food_class: 'Sandwich', time: '09:15' }
  ];

  const uid = me.data?.username || 'UNKNOWN';

  return (
    <div className="panel flex flex-col rounded-none p-0 border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,255,255,0.05)] relative flex-1 min-h-[350px]">
      {/* Header */}
      <div className="bg-neon-cyan/10 border-b border-neon-cyan/40 p-2">
        <h2 className="text-sm font-bold text-neon-cyan tracking-widest uppercase flex items-center gap-2">
          <div className="w-1.5 h-4 bg-neon-cyan"></div>
          RESERVATION_MGMT
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-4">
        
        {/* BOOKED List */}
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] text-neon-green font-bold tracking-widest border-b border-neon-green/30 pb-1 mb-2 uppercase">
            [ ACTIVE_BOOKINGS ]
          </h3>
          
          {isLoading ? (
            <div className="text-xs text-neon-green/60 font-mono data-matrix">SCANNING...</div>
          ) : bookedList.length === 0 ? (
            <div className="text-[10px] text-neon-green/40 italic font-mono border border-dashed border-neon-green/20 p-2">
              NO ACTIVE RESERVATIONS.
            </div>
          ) : (
            bookedList.map((f, i) => (
              <div key={i} className="flex flex-row items-center justify-between rounded-none border-l-2 border-neon-green bg-black/40 p-2 mb-1 shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] hover:bg-neon-green/5 transition-colors">
                
                {/* Left Side: Info */}
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="text-[11px] text-neon-green font-bold tracking-wider">
                    Target // {f.node_id}
                  </div>
                  <div className="text-[9px] text-white/70 font-mono">
                    <span className="text-neon-yellow/90">Card {uid}</span> | 
                    Food: {i18n.language === 'zh-TW' && f.display_name_zh ? f.display_name_zh : f.food_class}
                  </div>
                  <button 
                    onClick={() => selectNode(f.node_id)}
                    className="text-[8px] text-neon-cyan/80 hover:text-neon-cyan hover:underline text-left mt-1 w-fit uppercase"
                  >
                    &gt;&gt; LOCATE_ON_MAP
                  </button>
                </div>

                {/* Right Side: Action (Fixed inline Cancel) */}
                <div className="ml-2 shrink-0">
                  <button
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      if (window.confirm('ABORT RESERVATION?')) {
                        cancelMutation.mutate(f.node_id);
                      }
                    }}
                    className="btn-cyber btn-cyber-red border border-red-500 bg-[#1a0505] px-3 py-1.5 text-[10px] font-bold text-red-400 tracking-widest uppercase rounded shadow-[0_0_8px_rgba(255,0,0,0.5)]"
                  >
                    {cancelMutation.isPending ? '...' : '[ CANCEL ]'}
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* CANCEL List */}
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] text-neon-magenta font-bold tracking-widest border-b border-neon-magenta/30 pb-1 mb-2 uppercase">
            [ ABORTED_LOGS ]
          </h3>
          {cancelList.map(c => (
            <div key={c.id} className="text-[9px] text-neon-magenta/70 font-mono bg-black/30 p-1 border-l border-neon-magenta/30 pl-2">
              <span className="opacity-50">[{c.time}]</span> ABORTED // {c.node_id} ({c.food_class})
            </div>
          ))}
        </div>

      </div>

      {/* Embedded Pi Logs at the bottom of the panel */}
      <div className="border-t-2 border-neon-cyan/40 bg-[#020406] p-2 flex flex-col shrink-0 h-40">
         <EventFeed />
      </div>

    </div>
  );
}
