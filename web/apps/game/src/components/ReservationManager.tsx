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
    <div className="panel flex flex-col p-0 flex-1 min-h-[350px]">
      {/* Header */}
      <div className="bg-[#fcfaf8] border-b border-zen-border p-3">
        <h2 className="text-sm font-bold text-zen-text tracking-wide flex items-center gap-2">
          <div className="w-1.5 h-4 bg-zen-primary rounded-sm"></div>
          RESERVATION_MGMT
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-4 bg-white">
        
        {/* BOOKED List */}
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] text-zen-text font-bold tracking-wide border-b border-zen-border pb-1 mb-2 uppercase">
            ACTIVE BOOKINGS
          </h3>
          
          {isLoading ? (
            <div className="text-xs text-zen-light font-medium">Loading...</div>
          ) : bookedList.length === 0 ? (
            <div className="text-[10px] text-zen-light italic border border-dashed border-zen-border p-3 rounded-lg text-center">
              No active reservations.
            </div>
          ) : (
            bookedList.map((f, i) => (
              <div key={i} className="flex flex-row items-center justify-between rounded-lg border border-zen-border bg-[#fdfbf7] p-3 mb-2 shadow-sm hover:bg-[#f8f6f2] transition-colors">
                
                {/* Left Side: Info */}
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="text-[11px] text-zen-text font-bold">
                    Target // {f.node_id}
                  </div>
                  <div className="text-[10px] text-zen-light mt-1">
                    <span className="font-medium text-zen-accent">User: {uid}</span> | 
                    Food: {i18n.language === 'zh-TW' && f.display_name_zh ? f.display_name_zh : f.food_class}
                  </div>
                  <button 
                    onClick={() => selectNode(f.node_id)}
                    className="text-[10px] text-zen-primary hover:underline text-left mt-1.5 w-fit"
                  >
                    Locate on Map →
                  </button>
                </div>

                {/* Right Side: Action (Fixed inline Cancel) */}
                <div className="ml-3 shrink-0">
                  <button
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      if (window.confirm('Cancel reservation?')) {
                        cancelMutation.mutate(f.node_id);
                      }
                    }}
                    className="bg-[#fae6e5] text-zen-alert hover:bg-[#f5d0ce] rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors"
                  >
                    {cancelMutation.isPending ? '...' : 'Cancel'}
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* CANCEL List */}
        <div className="flex flex-col gap-1 mt-4">
          <h3 className="text-[10px] text-zen-light font-bold tracking-wide border-b border-zen-border pb-1 mb-2 uppercase">
            CANCELLED LOGS
          </h3>
          {cancelList.map(c => (
            <div key={c.id} className="text-[10px] text-zen-light bg-[#f8f6f2] p-2 rounded border border-zen-border/50 mb-1">
              <span className="opacity-70 mr-2">[{c.time}]</span> Cancelled // {c.node_id} ({c.food_class})
            </div>
          ))}
        </div>

      </div>

      {/* Embedded Pi Logs at the bottom of the panel */}
      <div className="border-t border-zen-border bg-[#fdfbf7] p-2 flex flex-col shrink-0 h-40">
         <EventFeed />
      </div>

    </div>
  );
}
